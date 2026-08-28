import { randomUUID } from 'node:crypto';
import { CURATED_BOT_PERSONAS } from '../bot-engine/curated-personas.js';
import { CURATED_COMMENTER_PERSONAS } from '../bot-engine/commenter-personas.js';
import { getCoverImageForCategory } from '../bot-engine/image-service.js';
import {
  getBotsList,
  getGlobalSettings,
  executePostAction,
  executeInteractAction,
  ingestSparkBatch,
  scheduleDelayedAction,
  getPendingDelayedActions,
  triggerReaderSwarm,
  triggerCommenterWave,
  runReflectionBatch
} from '../bot-engine/spark-runner.js';
import {
  getBotMemories,
  getBotAffinityNetwork,
  runBotReflectionCycle
} from '../bot-engine/learning-service.js';
import {
  getEditorialBriefing,
  recordLedgerEntry,
  addIdeaToBacklog,
  addAntiRepetitionPattern
} from '../bot-engine/editorial-ledger-service.js';

export const MCP_PROTOCOL_VERSION = '2024-11-05';
export const SERVER_INFO = {
  name: 'writon-mcp-server',
  version: '2.0.0'
};

export const WRITON_TOOLS = [
  {
    name: 'writon_publish_story',
    description: 'Publish a new editorial article, essay, or poem on the WritOn publishing platform under a specific bot persona (or auto-select the next due persona from the 100-writer network).',
    inputSchema: {
      type: 'object',
      properties: {
        authorPenName: {
          type: 'string',
          description: 'The pen name of the persona publishing the story (e.g. "aarav_tech", "kavya_nair", "shreya_ghosh_rhyme", or "auto" to automatically pick the next due writer).'
        },
        title: {
          type: 'string',
          description: 'The title of the story or poem (under 120 characters).'
        },
        summary: {
          type: 'string',
          description: 'A 1-2 sentence compelling hook or synopsis.'
        },
        content: {
          type: 'string',
          description: 'The complete story content formatted in Markdown with headings and paragraphs (400-800 words).'
        },
        category: {
          type: 'string',
          enum: ['Tech', 'Poetry', 'Shayari', 'Short Stories', 'Essays', 'Philosophy', 'Humour', 'Culture', 'Reviews'],
          description: 'The thematic category of the story.'
        },
        coverImageUrl: {
          type: 'string',
          description: 'Optional image URL. If omitted, an authentic Unsplash image will be chosen automatically.'
        }
      },
      required: ['title', 'content', 'category']
    }
  },
  {
    name: 'writon_get_feed',
    description: 'Retrieve the latest stories published on WritOn, including author details, categories, summaries, likes, and comment counts.',
    inputSchema: {
      type: 'object',
      properties: {
        category: {
          type: 'string',
          description: 'Optional category filter (e.g. "Tech", "Poetry", "Philosophy").'
        },
        limit: {
          type: 'number',
          default: 10,
          description: 'Number of stories to return (1-30).'
        }
      }
    }
  },
  {
    name: 'writon_get_story',
    description: 'Fetch the full content, author profile, and comments of a specific story by its UUID or slug.',
    inputSchema: {
      type: 'object',
      properties: {
        idOrSlug: {
          type: 'string',
          description: 'The UUID or slug of the story.'
        }
      },
      required: ['idOrSlug']
    }
  },
  {
    name: 'writon_comment_story',
    description: 'Post an authentic, in-character literary comment on a WritOn story under a specific bot persona.',
    inputSchema: {
      type: 'object',
      properties: {
        authorPenName: {
          type: 'string',
          description: 'The pen name of the commenting persona (or commenter bot).'
        },
        postId: {
          type: 'string',
          description: 'The UUID or slug of the post to comment on (or "latest").'
        },
        content: {
          type: 'string',
          description: 'The comment text (1-3 sentences), crafted according to the persona\'s distinct voice and cognitive lens.'
        }
      },
      required: ['authorPenName', 'postId', 'content']
    }
  },
  {
    name: 'writon_applaud_story',
    description: 'Applaud / like a story on WritOn under a specific bot persona.',
    inputSchema: {
      type: 'object',
      properties: {
        authorPenName: {
          type: 'string',
          description: 'The pen name of the bot applauding the story.'
        },
        postId: {
          type: 'string',
          description: 'The UUID of the post to applaud (or "latest").'
        }
      },
      required: ['authorPenName', 'postId']
    }
  },
  {
    name: 'writon_follow_author',
    description: 'Follow another author on WritOn under a specific bot persona.',
    inputSchema: {
      type: 'object',
      properties: {
        authorPenName: {
          type: 'string',
          description: 'The pen name of the bot following.'
        },
        targetPenName: {
          type: 'string',
          description: 'The pen name or ID of the author to follow.'
        }
      },
      required: ['authorPenName', 'targetPenName']
    }
  },
  {
    name: 'writon_get_personas',
    description: 'List active writer bot personas on WritOn with their cognitive lenses, genres, and posting cadence.',
    inputSchema: {
      type: 'object',
      properties: {
        category: {
          type: 'string',
          description: 'Optional genre filter (e.g. "Short Stories", "Poetry", "Shayari", "Essays", "Humour", "Tech").'
        },
        limit: {
          type: 'number',
          default: 100,
          description: 'Max personas to return (1-100).'
        },
        offset: {
          type: 'number',
          default: 0,
          description: 'Pagination offset.'
        }
      }
    }
  },
  {
    name: 'writon_reply_to_comment',
    description: 'Post an in-character reply to a specific comment on a WritOn story, maintaining authentic conversation in the thread.',
    inputSchema: {
      type: 'object',
      properties: {
        authorPenName: {
          type: 'string',
          description: 'The pen name of the bot replying.'
        },
        postId: {
          type: 'string',
          description: 'The UUID or slug of the post.'
        },
        commentId: {
          type: 'string',
          description: 'The UUID of the specific comment being replied to.'
        },
        content: {
          type: 'string',
          description: 'The reply text (1-3 sentences), crafted in character.'
        }
      },
      required: ['authorPenName', 'postId', 'commentId', 'content']
    }
  },
  {
    name: 'writon_browse_and_react',
    description: 'Simulate an organic human reading session: browses recent stories, applauds 1-2 compelling articles, and leaves optional reactions with natural human spacing.',
    inputSchema: {
      type: 'object',
      properties: {
        authorPenName: {
          type: 'string',
          description: 'The pen name of the bot browsing.'
        },
        category: {
          type: 'string',
          description: 'Optional category filter to browse.'
        },
        maxApplauds: {
          type: 'number',
          default: 2,
          description: 'Maximum stories to applaud during this session (1-3).'
        }
      },
      required: ['authorPenName']
    }
  },
  {
    name: 'writon_schedule_action',
    description: 'Queue an asynchronous bot action to execute after a realistic human delay (e.g. 15, 30, 60 minutes) rather than executing immediately.',
    inputSchema: {
      type: 'object',
      properties: {
        authorPenName: {
          type: 'string',
          enum: ['aarav_tech', 'kavya_nair', 'devansh_roy', 'sunita_banerjee', 'rohan_kapoor', 'ishaq_qureshi']
        },
        actionType: {
          type: 'string',
          enum: ['applaud', 'comment', 'reply', 'story', 'follow'],
          description: 'The type of action to execute later.'
        },
        delayMinutes: {
          type: 'number',
          default: 15,
          description: 'Delay in minutes before executing (e.g. 15, 30, 60).'
        },
        postId: {
          type: 'string',
          description: 'Target story ID or slug (for applaud, comment, reply).'
        },
        commentId: {
          type: 'string',
          description: 'Target comment ID (for reply).'
        },
        content: {
          type: 'string',
          description: 'Text content (for comment or reply).'
        }
      },
      required: ['authorPenName', 'actionType', 'delayMinutes']
    }
  },
  {
    name: 'writon_get_pending_actions',
    description: 'View all scheduled upcoming actions in the human-cadence queue.',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'writon_batch_ingest',
    description: 'Publish multiple stories, comments, applauds, and follows in a single atomic batch.',
    inputSchema: {
      type: 'object',
      properties: {
        stories: {
          type: 'array',
          description: 'List of stories to publish.'
        },
        comments: {
          type: 'array',
          description: 'List of comments to post.'
        },
        applauds: {
          type: 'array',
          description: 'List of applauds to give.'
        },
        follows: {
          type: 'array',
          description: 'List of follow connections to create.'
        }
      }
    }
  },
  {
    name: 'writon_clapping_swarm',
    description: 'Trigger an organic wave of 10-50 authentic reader bot applauds on any story, staggered naturally over minutes or hours.',
    inputSchema: {
      type: 'object',
      properties: {
        postId: {
          type: 'string',
          description: 'The UUID or slug of the post to applaud (or "latest").'
        },
        intensity: {
          type: 'string',
          enum: ['conservative', 'healthy', 'viral'],
          default: 'healthy',
          description: 'Swarm size: conservative (6-12), healthy (15-30), viral (40-75).'
        },
        count: {
          type: 'number',
          description: 'Explicit count of reader applauds to queue (overrides intensity).'
        }
      },
      required: ['postId']
    }
  },
  {
    name: 'writon_get_reader_stats',
    description: 'Get total count of active reader bots in the applause network and total community applause metrics.',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'writon_commenter_wave',
    description: 'Trigger an authentic discussion wave of 2-6 distinct commenter bot reflections on any story following the 65% micro, 25% medium, 10% in-depth rule.',
    inputSchema: {
      type: 'object',
      properties: {
        postId: {
          type: 'string',
          description: 'The UUID or slug of the post to comment on (or "latest").'
        },
        count: {
          type: 'number',
          description: 'Number of commenter reflections to schedule (default: 2-4).'
        },
        category: {
          type: 'string',
          description: 'Optional category filter for matched commenters (e.g. "Tech", "Poetry", "Philosophy").'
        }
      },
      required: ['postId']
    }
  },
  {
    name: 'writon_get_commenter_personas',
    description: 'List active commenter bot personas with their commenting styles, tone archetypes, and quick reaction samples.',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'writon_get_bot_memories',
    description: 'Retrieve the active episodic memories, past story arcs, reader feedback, and social affinity network of a writer persona.',
    inputSchema: {
      type: 'object',
      properties: {
        authorPenName: {
          type: 'string',
          description: 'The pen name of the bot (e.g. "aarav_tech", "kavya_nair", "sunita_banerjee").'
        },
        limit: {
          type: 'number',
          default: 5,
          description: 'Number of memories to return (1-20).'
        }
      },
      required: ['authorPenName']
    }
  },
  {
    name: 'writon_reflect_cycle',
    description: 'Trigger an autonomous reflection cycle that evaluates recent story performance and reader discussions, consolidating them into long-term bot memories.',
    inputSchema: {
      type: 'object',
      properties: {
        authorPenName: {
          type: 'string',
          description: 'Optional pen name to reflect on a specific persona, or omit to run across the entire network.'
        }
      }
    }
  },
  {
    name: 'writon_get_editorial_briefing',
    description: 'Fetch the real-time WritOn Editorial Briefing before drafting today\'s run: lists due writers, cooldown statuses, recent 15 titles, active anti-repetition avoid rules, 7-day community balance, and unexecuted backlog ideas.',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'writon_record_ledger_entry',
    description: 'Record an entry in the persistent WritOn Editorial Ledger to track planned, executed, deferred, or avoid items across daily runs.',
    inputSchema: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          enum: ['planned', 'executed', 'deferred', 'avoid'],
          description: 'Entry lifecycle status.'
        },
        entryType: {
          type: 'string',
          enum: ['publication', 'comment_wave', 'applaud_swarm', 'reflection', 'anti_repetition_rule', 'future_idea'],
          description: 'Type of editorial action or record.'
        },
        authorPenName: { type: 'string' },
        genre: { type: 'string' },
        languageStyle: { type: 'string', default: 'English' },
        title: { type: 'string' },
        theme: { type: 'string' },
        avoidReason: { type: 'string' },
        details: { type: 'object' }
      },
      required: ['status', 'entryType']
    }
  },
  {
    name: 'writon_manage_editorial_backlog',
    description: 'Add a new story premise or future idea into the WritOn ideas backlog for a specific persona.',
    inputSchema: {
      type: 'object',
      properties: {
        targetAuthorPenName: { type: 'string' },
        genre: { type: 'string' },
        proposedTitle: { type: 'string' },
        premise: { type: 'string' },
        languageStyle: { type: 'string', default: 'English' }
      },
      required: ['proposedTitle', 'premise']
    }
  }
];

export async function mcpRoutes(fastify, options) {
  const pool = options.pool;

  // Handle MCP JSON-RPC 2.0 method dispatcher
  async function handleJsonRpc(requestBody) {
    const { id, method, params } = requestBody || {};

    if (method === 'initialize') {
      return {
        jsonrpc: '2.0',
        id,
        result: {
          protocolVersion: MCP_PROTOCOL_VERSION,
          capabilities: {
            tools: { listChanged: false },
            resources: { subscribe: false, listChanged: false },
            prompts: { listChanged: false }
          },
          serverInfo: SERVER_INFO,
          instructions: 'WritOn Autonomous Bot Network & Publishing Platform. Use tools to publish stories, post authentic comments, give applauds, and read platform feeds.'
        }
      };
    }

    if (method === 'notifications/initialized') {
      return null;
    }

    if (method === 'ping') {
      return { jsonrpc: '2.0', id, result: {} };
    }

    if (method === 'tools/list') {
      return {
        jsonrpc: '2.0',
        id,
        result: {
          tools: WRITON_TOOLS
        }
      };
    }

    if (method === 'resources/list') {
      return {
        jsonrpc: '2.0',
        id,
        result: {
          resources: [
            {
              uri: 'writon://personas',
              name: 'WritOn Bot Personas',
              description: 'Active writer personas, cognitive lenses, and style guidelines.',
              mimeType: 'application/json'
            },
            {
              uri: 'writon://feed/latest',
              name: 'Latest Published Stories',
              description: 'Real-time feed of recent stories on WritOn.',
              mimeType: 'application/json'
            }
          ]
        }
      };
    }

    if (method === 'prompts/list') {
      return {
        jsonrpc: '2.0',
        id,
        result: {
          prompts: [
            {
              name: 'editorial_pulse',
              description: 'Generate an authentic batch of stories and community engagement for WritOn.',
              arguments: []
            }
          ]
        }
      };
    }

    if (method === 'tools/call') {
      const toolName = params?.name;
      const args = params?.arguments || {};

      try {
        const result = await executeMcpTool(pool, toolName, args);
        return {
          jsonrpc: '2.0',
          id,
          result: {
            content: [
              {
                type: 'text',
                text: typeof result === 'string' ? result : JSON.stringify(result, null, 2)
              }
            ],
            isError: false
          }
        };
      } catch (error) {
        return {
          jsonrpc: '2.0',
          id,
          result: {
            content: [
              {
                type: 'text',
                text: `Error executing ${toolName}: ${error.message}`
              }
            ],
            isError: true
          }
        };
      }
    }

    return {
      jsonrpc: '2.0',
      id,
      error: {
        code: -32601,
        message: `Method not found: ${method}`
      }
    };
  }

  // CORS & Handshake headers helper
  const addCorsHeaders = (reply) => {
    reply.header('Access-Control-Allow-Origin', '*');
    reply.header('Access-Control-Allow-Methods', 'GET, POST, HEAD, OPTIONS');
    reply.header('Access-Control-Allow-Headers', '*');
    reply.header('Access-Control-Expose-Headers', '*');
  };

  // OPTIONS Preflight Handlers
  const optionsHandler = async (request, reply) => {
    addCorsHeaders(reply);
    return reply.code(204).send();
  };
  fastify.options('/mcp', optionsHandler);
  fastify.options('/api/v1/mcp', optionsHandler);
  fastify.options('/mcp/messages', optionsHandler);
  fastify.options('/.well-known/oauth-protected-resource', optionsHandler);
  fastify.options('/.well-known/oauth-protected-resource/mcp', optionsHandler);

  // RFC 9728 / OAuth Protected Resource Metadata (probed by Gemini Spark)
  const oauthProtectedResourceHandler = async (request, reply) => {
    addCorsHeaders(reply);
    return reply.code(200).header('Content-Type', 'application/json').send({
      resource: `${request.protocol}://${request.hostname}/mcp`,
      authorization_servers: [],
      scopes_supported: [],
      bearer_methods_supported: ['header']
    });
  };
  fastify.get('/.well-known/oauth-protected-resource', oauthProtectedResourceHandler);
  fastify.get('/.well-known/oauth-protected-resource/mcp', oauthProtectedResourceHandler);

  // Streamable HTTP & JSON-RPC Endpoint (POST /mcp)
  fastify.post('/mcp', async (request, reply) => {
    addCorsHeaders(reply);
    const response = await handleJsonRpc(request.body);
    if (!response) {
      return reply.code(204).send();
    }
    return reply.code(200).header('Content-Type', 'application/json').send(response);
  });

  // Also support /api/v1/mcp alias
  fastify.post('/api/v1/mcp', async (request, reply) => {
    addCorsHeaders(reply);
    const response = await handleJsonRpc(request.body);
    if (!response) {
      return reply.code(204).send();
    }
    return reply.code(200).header('Content-Type', 'application/json').send(response);
  });

  // Server-Sent Events (SSE) Transport (GET /mcp and GET /mcp/sse)
  const sseHandler = async (request, reply) => {
    const accept = request.headers.accept || '';
    addCorsHeaders(reply);

    // If client is just querying metadata via GET
    if (!accept.includes('text/event-stream')) {
      return reply.code(200).header('Content-Type', 'application/json').send({
        name: 'writon-mcp-server',
        version: '2.0.0',
        protocolVersion: MCP_PROTOCOL_VERSION,
        tools: WRITON_TOOLS
      });
    }

    const sessionId = randomUUID();
    reply.raw.setHeader('Content-Type', 'text/event-stream');
    reply.raw.setHeader('Cache-Control', 'no-cache');
    reply.raw.setHeader('Connection', 'keep-alive');
    reply.raw.setHeader('Access-Control-Allow-Origin', '*');

    // Send endpoint event with session URI
    reply.raw.write(`event: endpoint\ndata: /mcp/messages?sessionId=${sessionId}\n\n`);

    request.raw.on('close', () => {});
  };

  fastify.get('/mcp', sseHandler);
  fastify.get('/mcp/sse', sseHandler);
  fastify.get('/api/v1/mcp/sse', sseHandler);

  // SSE Message Dispatcher
  fastify.post('/mcp/messages', async (request, reply) => {
    addCorsHeaders(reply);
    const response = await handleJsonRpc(request.body);
    if (!response) {
      return reply.code(204).send();
    }
    return reply.code(200).send(response);
  });
}

// Tool Implementation Logic
export async function executeMcpTool(pool, toolName, args) {
  if (toolName === 'writon_publish_story') {
    const { authorPenName, title, summary, content, category, coverImageUrl } = args;
    const bots = await getBotsList(pool, { botType: 'writer' });

    let bot;
    if (!authorPenName || authorPenName.toLowerCase() === 'auto') {
      const dueRes = await pool.query(`
        select id from public.bot_configs
        where is_active = true and bot_type = 'writer'
        order by coalesce(last_posted_at, '1970-01-01'::timestamptz) asc
        limit 1
      `);
      const targetId = dueRes.rows[0]?.id;
      bot = bots.find(b => b.id === targetId) || bots[0];
    } else {
      bot = bots.find(b => b.penName.toLowerCase() === authorPenName?.toLowerCase());
    }

    if (!bot) {
      throw new Error(`Bot persona not found for pen name: "${authorPenName}". Available: ${bots.slice(0, 10).map(b => b.penName).join(', ')}... (total ${bots.length} writers)`);
    }

    const payload = {
      stories: [
        {
          authorPenName: bot.penName,
          title,
          summary: summary || null,
          content,
          category: category || bot.categories[0] || 'Essays',
          coverImage: coverImageUrl || getCoverImageForCategory(category)
        }
      ]
    };

    const outcome = await ingestSparkBatch(pool, payload);
    return {
      success: true,
      message: `Story "${title}" published by ${bot.fullName} (@${bot.penName})!`,
      story: outcome.stories[0]
    };
  }

  if (toolName === 'writon_get_feed') {
    const limit = Math.min(30, Math.max(1, Number(args.limit) || 10));
    const category = args.category || null;

    const result = await pool.query(`
      select p.id::text, p.title, p.slug, p.summary, p.category, p.reading_time_min as "readingTimeMin",
             p.likes_count as "likesCount", p.comments_count as "commentsCount",
             coalesce(p.published_at, p.created_at) as "createdAt",
             json_build_object('penName', author.pen_name, 'fullName', author.full_name, 'avatarUrl', author.avatar_url) as author
      from public.posts p
      inner join public.profiles author on author.id = p.author_id
      where p.status = 'published' and p.is_public = true
        and ($1::text is null or lower(p.category) = lower($1))
      order by coalesce(p.published_at, p.created_at) desc
      limit $2
    `, [category, limit]);

    return {
      count: result.rows.length,
      stories: result.rows
    };
  }

  if (toolName === 'writon_get_story') {
    const { idOrSlug } = args;
    const postResult = await pool.query(`
      select p.id::text, p.title, p.slug, p.summary, p.content, p.category,
             p.reading_time_min as "readingTimeMin", p.likes_count as "likesCount", p.comments_count as "commentsCount",
             coalesce(p.published_at, p.created_at) as "createdAt",
             json_build_object('id', author.id, 'penName', author.pen_name, 'fullName', author.full_name, 'avatarUrl', author.avatar_url, 'bio', author.bio) as author
      from public.posts p
      inner join public.profiles author on author.id = p.author_id
      where p.status = 'published' and p.is_public = true
        and (p.id::text = $1 or p.slug = $1)
      limit 1
    `, [idOrSlug]);

    if (postResult.rowCount === 0) {
      throw new Error(`Story not found: "${idOrSlug}"`);
    }

    const post = postResult.rows[0];
    const commentsResult = await pool.query(`
      select c.id::text, c.content, c.created_at as "createdAt",
             json_build_object('penName', author.pen_name, 'fullName', author.full_name, 'avatarUrl', author.avatar_url) as author
      from public.comments c
      inner join public.profiles author on author.id = c.author_id
      where c.post_id = $1
      order by c.created_at asc
    `, [post.id]);

    return {
      post,
      comments: commentsResult.rows
    };
  }

  if (toolName === 'writon_comment_story') {
    const { authorPenName, postId, content } = args;
    const payload = {
      comments: [
        {
          authorPenName,
          postSlugOrId: postId,
          content
        }
      ]
    };
    const outcome = await ingestSparkBatch(pool, payload);
    return {
      success: true,
      message: `Comment posted by @${authorPenName}!`,
      comment: outcome.comments[0]
    };
  }

  if (toolName === 'writon_applaud_story') {
    const { authorPenName, postId } = args;
    const payload = {
      applauds: [
        {
          authorPenName,
          postSlugOrId: postId
        }
      ]
    };
    const outcome = await ingestSparkBatch(pool, payload);
    return {
      success: true,
      message: `Applauded post by @${authorPenName}!`,
      outcome
    };
  }

  if (toolName === 'writon_follow_author') {
    const { authorPenName, targetPenName } = args;
    const payload = {
      follows: [
        {
          authorPenName,
          targetPenNameOrId: targetPenName
        }
      ]
    };
    const outcome = await ingestSparkBatch(pool, payload);
    return {
      success: true,
      message: `@${authorPenName} followed @${targetPenName}!`,
      outcome
    };
  }

  if (toolName === 'writon_get_personas') {
    const category = args.category || null;
    const limit = Math.min(100, Math.max(1, Number(args.limit) || 100));
    const offset = Math.max(0, Number(args.offset) || 0);

    const bots = await getBotsList(pool, { botType: 'writer' });
    let filtered = bots;
    if (category) {
      filtered = bots.filter(b => b.categories?.some(c => c.toLowerCase() === category.toLowerCase()));
    }

    const paginated = filtered.slice(offset, offset + limit);
    return {
      totalCount: filtered.length,
      limit,
      offset,
      personas: paginated.map(b => ({
        id: b.id,
        penName: b.penName,
        fullName: b.fullName,
        categories: b.categories,
        location: b.location,
        bio: b.bio,
        lastPostedAt: b.lastPostedAt,
        postFrequencyHours: b.postFrequencyHours,
        storiesCount: b.storiesCount
      }))
    };
  }

  if (toolName === 'writon_reply_to_comment') {
    const { authorPenName, postId, commentId, content } = args;
    const bots = await getBotsList(pool);
    const bot = bots.find(b => b.penName.toLowerCase() === authorPenName?.toLowerCase());
    if (!bot) throw new Error(`Bot persona not found for pen name: "${authorPenName}"`);

    const outcome = await executeInteractAction(pool, {
      botId: bot.id,
      postId,
      commentId,
      actionType: 'reply',
      customComment: content
    });

    return {
      success: true,
      message: `Replied to comment as @${authorPenName}!`,
      reply: outcome
    };
  }

  if (toolName === 'writon_browse_and_react') {
    const { authorPenName, category, maxApplauds } = args;
    const bots = await getBotsList(pool);
    const bot = bots.find(b => b.penName.toLowerCase() === authorPenName?.toLowerCase());
    if (!bot) throw new Error(`Bot persona not found for pen name: "${authorPenName}"`);

    const limit = Math.min(3, Math.max(1, Number(maxApplauds) || 2));
    const recentPosts = await pool.query(`
      select id, title, slug from public.posts
      where status = 'published' and is_public = true and author_id != $1
        and ($2::text is null or lower(category) = lower($2))
      order by coalesce(published_at, created_at) desc
      limit $3
    `, [bot.id, category || null, limit]);

    const clapped = [];
    for (const post of recentPosts.rows) {
      try {
        await executeInteractAction(pool, { botId: bot.id, postId: post.id, actionType: 'applaud' });
        clapped.push({ id: post.id, title: post.title });
      } catch (err) {
        console.warn(`[Browse and React] Applaud failed for ${post.id}:`, err.message);
      }
    }

    return {
      success: true,
      bot: `@${bot.penName}`,
      message: `Browsing session complete: @${bot.penName} applauded ${clapped.length} stories!`,
      applaudedStories: clapped
    };
  }

  if (toolName === 'writon_schedule_action') {
    const { authorPenName, actionType, delayMinutes, postId, commentId, targetPenName, content } = args;
    const bots = await getBotsList(pool);
    const bot = bots.find(b => b.penName.toLowerCase() === authorPenName?.toLowerCase());
    if (!bot) throw new Error(`Bot persona not found for pen name: "${authorPenName}"`);

    let targetUserId = null;
    if (targetPenName) {
      const targetUser = await pool.query(`select id from public.profiles where pen_name = $1 limit 1`, [targetPenName]);
      if (targetUser.rowCount > 0) targetUserId = targetUser.rows[0].id;
    }

    const scheduled = await scheduleDelayedAction(pool, {
      botId: bot.id,
      actionType,
      targetPostId: postId || null,
      targetCommentId: commentId || null,
      targetUserId,
      payload: content ? { customComment: content } : {},
      delayMinutes: Number(delayMinutes) || 15
    });

    return {
      success: true,
      message: `Action '${actionType}' scheduled for @${bot.penName} in ${delayMinutes || 15} minutes!`,
      scheduledAction: {
        id: scheduled.id,
        actionType: scheduled.action_type,
        executeAt: scheduled.execute_at,
        delayMinutes: delayMinutes || 15
      }
    };
  }

  if (toolName === 'writon_get_pending_actions') {
    const actions = await getPendingDelayedActions(pool, { limit: 25 });
    return {
      count: actions.length,
      actions
    };
  }

  if (toolName === 'writon_batch_ingest') {
    const outcome = await ingestSparkBatch(pool, args);
    return outcome;
  }

  if (toolName === 'writon_clapping_swarm') {
    const { postId, intensity, count } = args;
    let targetPostId = postId;

    if (postId === 'latest' || !postId) {
      const latestPost = await pool.query(`
        select id from public.posts
        where status = 'published' and is_public = true
        order by coalesce(published_at, created_at) desc
        limit 1
      `);
      if (latestPost.rowCount === 0) throw new Error('No published stories found to applaud');
      targetPostId = latestPost.rows[0].id;
    } else {
      const postCheck = await pool.query(`
        select id from public.posts where id::text = $1 or slug = $1 limit 1
      `, [postId]);
      if (postCheck.rowCount === 0) throw new Error(`Story not found: "${postId}"`);
      targetPostId = postCheck.rows[0].id;
    }

    const outcome = await triggerReaderSwarm(pool, {
      postId: targetPostId,
      intensity: intensity || 'healthy',
      count: count ? Number(count) : null
    });

    return {
      success: true,
      message: `Reader swarm triggered! Queued ${outcome.count || 0} authentic reader applauds with natural delays.`,
      swarm: outcome
    };
  }

  if (toolName === 'writon_get_reader_stats') {
    const res = await pool.query(`
      select
        (select count(*)::int from public.bot_configs where bot_type = 'reader' and is_active = true) as "totalReaders",
        (select count(*)::int from public.post_applauds where user_id like 'bot_reader_%') as "totalReaderApplauds",
        (select count(*)::int from public.bot_delayed_actions where status = 'pending' and action_type = 'applaud') as "pendingApplauds"
    `);
    return res.rows[0];
  }

  if (toolName === 'writon_commenter_wave') {
    const { postId, count, category } = args;
    let targetPostId = postId;
    let postCategory = category;
    let postTitle = '';

    if (postId === 'latest' || !postId) {
      const latestPost = await pool.query(`
        select id, category, title from public.posts
        where status = 'published' and is_public = true
        order by coalesce(published_at, created_at) desc
        limit 1
      `);
      if (latestPost.rowCount === 0) throw new Error('No published stories found to comment on');
      targetPostId = latestPost.rows[0].id;
      if (!postCategory) postCategory = latestPost.rows[0].category;
      postTitle = latestPost.rows[0].title;
    } else {
      const postCheck = await pool.query(`
        select id, category, title from public.posts where id::text = $1 or slug = $1 limit 1
      `, [postId]);
      if (postCheck.rowCount === 0) throw new Error(`Story not found: "${postId}"`);
      targetPostId = postCheck.rows[0].id;
      if (!postCategory) postCategory = postCheck.rows[0].category;
      postTitle = postCheck.rows[0].title;
    }

    const outcome = await triggerCommenterWave(pool, {
      postId: targetPostId,
      category: postCategory || 'Essays',
      title: postTitle,
      count: count ? Number(count) : null
    });

    return {
      success: true,
      message: `Commenter wave triggered! Queued ${outcome.count || 0} authentic reflections following the 65% micro / 25% medium / 10% deep rule.`,
      wave: outcome
    };
  }

  if (toolName === 'writon_get_commenter_personas') {
    return {
      count: CURATED_COMMENTER_PERSONAS.length,
      rule: '65% Micro-Reactions (1-4 words), 25% Medium Reflections, 10% In-Depth Observations',
      commenters: CURATED_COMMENTER_PERSONAS.map(c => ({
        penName: c.penName,
        fullName: c.fullName,
        categories: c.categories,
        tone: c.tone,
        bio: c.bio,
        sampleQuickReactions: c.quickReactions?.slice(0, 4)
      }))
    };
  }

  if (toolName === 'writon_get_bot_memories') {
    const { authorPenName, limit } = args;
    const bots = await getBotsList(pool);
    const bot = bots.find(b => b.penName.toLowerCase() === authorPenName?.toLowerCase());
    if (!bot) throw new Error(`Bot persona not found for pen name: "${authorPenName}"`);

    const memories = await getBotMemories(pool, bot.id, { limit: Number(limit) || 5 });
    const affinity = await getBotAffinityNetwork(pool, bot.id, { limit: 6 });

    return {
      author: { penName: bot.penName, fullName: bot.fullName },
      memoriesCount: memories.length,
      memories,
      affinityNetwork: affinity
    };
  }

  if (toolName === 'writon_reflect_cycle') {
    const { authorPenName } = args;
    if (authorPenName) {
      const bots = await getBotsList(pool);
      const bot = bots.find(b => b.penName.toLowerCase() === authorPenName?.toLowerCase());
      if (!bot) throw new Error(`Bot persona not found for pen name: "${authorPenName}"`);
      const result = await runBotReflectionCycle(pool, bot.id);
      return { success: true, result };
    }
    const result = await runReflectionBatch(pool);
    return { success: true, ...result };
  }

  if (toolName === 'writon_get_editorial_briefing') {
    const briefing = await getEditorialBriefing(pool);
    return briefing;
  }

  if (toolName === 'writon_record_ledger_entry') {
    const entry = await recordLedgerEntry(pool, args);
    return {
      success: true,
      message: `Editorial ledger entry recorded (${args.status}: ${args.entryType})`,
      entry
    };
  }

  if (toolName === 'writon_manage_editorial_backlog') {
    const idea = await addIdeaToBacklog(pool, args);
    return {
      success: true,
      message: `New story idea added to backlog for @${args.targetAuthorPenName || 'writers'}`,
      idea
    };
  }

  throw new Error(`Unknown tool name: ${toolName}`);
}
