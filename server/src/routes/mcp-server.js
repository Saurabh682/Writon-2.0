import { randomUUID } from 'node:crypto';
import { CURATED_BOT_PERSONAS } from '../bot-engine/curated-personas.js';
import { getCoverImageForCategory } from '../bot-engine/image-service.js';
import {
  getBotsList,
  getGlobalSettings,
  executePostAction,
  executeInteractAction,
  ingestSparkBatch
} from '../bot-engine/spark-runner.js';

const MCP_PROTOCOL_VERSION = '2024-11-05';
const SERVER_INFO = {
  name: 'writon-mcp-server',
  version: '2.0.0'
};

const WRITON_TOOLS = [
  {
    name: 'writon_publish_story',
    description: 'Publish a new editorial article, essay, or poem on the WritOn publishing platform under a specific bot persona.',
    inputSchema: {
      type: 'object',
      properties: {
        authorPenName: {
          type: 'string',
          enum: ['aarav_tech', 'kavya_nair', 'devansh_roy', 'sunita_banerjee', 'rohan_kapoor', 'ishaq_qureshi'],
          description: 'The pen name of the persona publishing the story.'
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
          enum: ['Tech', 'Poetry', 'Shayari', 'Short Stories', 'Essays', 'Philosophy', 'Humour', 'Culture'],
          description: 'The thematic category of the story.'
        },
        coverImageUrl: {
          type: 'string',
          description: 'Optional image URL. If omitted, an authentic Unsplash image will be chosen automatically.'
        }
      },
      required: ['authorPenName', 'title', 'content', 'category']
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
          enum: ['aarav_tech', 'kavya_nair', 'devansh_roy', 'sunita_banerjee', 'rohan_kapoor', 'ishaq_qureshi'],
          description: 'The pen name of the commenting persona.'
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
          enum: ['aarav_tech', 'kavya_nair', 'devansh_roy', 'sunita_banerjee', 'rohan_kapoor', 'ishaq_qureshi']
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
          enum: ['aarav_tech', 'kavya_nair', 'devansh_roy', 'sunita_banerjee', 'rohan_kapoor', 'ishaq_qureshi']
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
    description: 'List all active writer bot personas on WritOn with their cognitive lenses, 3-layer personality stacks, and anti-goals.',
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
async function executeMcpTool(pool, toolName, args) {
  if (toolName === 'writon_publish_story') {
    const { authorPenName, title, summary, content, category, coverImageUrl } = args;
    const bots = await getBotsList(pool);
    const bot = bots.find(b => b.penName.toLowerCase() === authorPenName?.toLowerCase());

    if (!bot) {
      throw new Error(`Bot persona not found for pen name: "${authorPenName}". Available: ${bots.map(b => b.penName).join(', ')}`);
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
    const bots = await getBotsList(pool);
    return {
      count: bots.length,
      personas: bots.map(b => ({
        penName: b.penName,
        fullName: b.fullName,
        categories: b.categories,
        bio: b.bio,
        prompt: b.personaPrompt,
        commentStyle: b.commentStyle
      }))
    };
  }

  if (toolName === 'writon_batch_ingest') {
    const outcome = await ingestSparkBatch(pool, args);
    return outcome;
  }

  throw new Error(`Unknown tool name: ${toolName}`);
}
