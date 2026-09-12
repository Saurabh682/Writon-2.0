# Reddit API Endpoints Reference (`reddit_api_reference.md`)

> **Comprehensive API Directory & Schema Guide**  
> **Base OAuth API URL**: `https://oauth.reddit.com`  
> **Token Endpoint**: `https://www.reddit.com/api/v1/access_token`  
> **Source**: [Reddit API Official Documentation](https://www.reddit.com/dev/api/?logging_in=true)

---

## Quick Navigation by Category
1. [Account](#1-account)
2. [Announcements](#2-announcements)
3. [Captcha](#3-captcha)
4. [Emoji](#4-emoji)
5. [Flair](#5-flair)
6. [Links & Comments](#6-links--comments)
7. [Listings](#7-listings)
8. [Live Threads](#8-live-threads)
9. [Private Messages](#9-private-messages)
10. [Misc & Scopes](#10-misc--scopes)
11. [Moderation](#11-moderation)
12. [New Modmail](#12-new-modmail)
13. [Mod Notes](#13-mod-notes)
14. [Multis (Custom Feeds)](#14-multis-custom-feeds)
15. [Search](#15-search)
16. [Subreddits](#16-subreddits)
17. [Users](#17-users)
18. [Widgets](#18-widgets)
19. [Wiki](#19-wiki)

---

## 1. Account

| Endpoint | Method | Scope | Description & Key Parameters |
| :--- | :--- | :--- | :--- |
| `/api/v1/me` | `GET` | `identity` | Returns authenticated user's profile identity (id, name, karma, created, etc.). |
| `/api/v1/me/karma` | `GET` | `mysubreddits` | Returns breakdown of subreddit karma (`sr`, `comment_karma`, `link_karma`). |
| `/api/v1/me/prefs` | `GET` | `identity` | Returns user preference settings. Parameter: `fields` (comma-separated filter list). |
| `/api/v1/me/prefs` | `PATCH` | `account` | Updates user preferences via JSON body (`accept_pms`, `default_comment_sort`, `nightmode`, `over_18`, `lang`, etc.). |
| `/api/v1/me/trophies` | `GET` | `identity` | Returns list of trophies awarded to the current user. |
| `/prefs/{where}` | `GET` | `read` | Listing of user relations: `/prefs/friends`, `/prefs/blocked`, `/prefs/messaging`, `/prefs/trusted`. |

---

## 2. Announcements

| Endpoint | Method | Scope | Description & Key Parameters |
| :--- | :--- | :--- | :--- |
| `/api/announcements/v1` | `GET` | `announcements` | Fetch platform announcements. Parameters: `after`, `before`, `limit` (1–100). |
| `/api/announcements/v1/unread` | `GET` | `announcements` | Fetch unread platform announcements. |
| `/api/announcements/v1/hide` | `POST` | `announcements` | Marks announcements hidden. Parameter: `ids` (comma-separated `ann_` fullnames). |
| `/api/announcements/v1/read` | `POST` | `announcements` | Marks announcements read. Parameter: `ids` (comma-separated `ann_` fullnames). |
| `/api/announcements/v1/read_all` | `POST` | `announcements` | Marks all unread announcements read. |

---

## 3. Captcha

| Endpoint | Method | Scope | Description & Key Parameters |
| :--- | :--- | :--- | :--- |
| `/api/needs_captcha` | `GET` | `any` | Checks whether reCAPTCHAs are currently required for API calls. |

---

## 4. Emoji

| Endpoint | Method | Scope | Description & Key Parameters |
| :--- | :--- | :--- | :--- |
| `/api/v1/{subreddit}/emoji.json` | `POST` | `structuredstyles` | Adds/updates custom emoji. Parameters: `name` (max 24 chars), `s3_key`, `mod_flair_only`, `post_flair_allowed`, `user_flair_allowed`. |
| `/api/v1/{subreddit}/emoji/{emoji_name}` | `DELETE` | `structuredstyles` | Deletes subreddit custom emoji. |
| `/api/v1/{subreddit}/emoji_asset_upload_s3.json` | `POST` | `structuredstyles` | Requests S3 lease & upload URL for emoji image asset. Parameters: `filepath`, `mimetype`. |
| `/api/v1/{subreddit}/emoji_custom_size` | `POST` | `structuredstyles` | Sets custom emoji dimensions (`height`, `width` between 1 and 40). |
| `/api/v1/{subreddit}/emojis/all` | `GET` | `read` | Retrieves all emojis (snoomojis + subreddit custom emojis). |

---

## 5. Flair

| Endpoint | Method | Scope | Description & Key Parameters |
| :--- | :--- | :--- | :--- |
| `[/r/{sub}]/api/clearflairtemplates` | `POST` | `modflair` | Clears flair templates. Parameters: `flair_type` (`USER_FLAIR`, `LINK_FLAIR`). |
| `[/r/{sub}]/api/deleteflair` | `POST` | `modflair` | Deletes flair for a user. Parameter: `name`. |
| `[/r/{sub}]/api/deleteflairtemplate` | `POST` | `modflair` | Deletes a template. Parameter: `flair_template_id`. |
| `[/r/{sub}]/api/flair` | `POST` | `modflair` | Assigns flair to link or user. Parameters: `name`, `link`, `text` (max 64), `css_class`. |
| `[/r/{sub}]/api/flair_template_order`| `PATCH`| `modflair` | Reorders templates. Must supply complete list of all flair IDs. |
| `[/r/{sub}]/api/flairconfig` | `POST` | `modflair` | Configures flair enablement, positions (`left`/`right`), and self-assignability. |
| `[/r/{sub}]/api/flaircsv` | `POST` | `modflair` | Batch update flairs for up to 100 users via CSV lines (`user,flairtext,cssclass`). |
| `[/r/{sub}]/api/flairlist` | `GET` | `modflair` | Listing of assigned flairs in subreddit. |
| `[/r/{sub}]/api/flairselector` | `POST` | `flair` | Retrieves user/link flair options for selection. |
| `[/r/{sub}]/api/flairtemplate` | `POST` | `modflair` | Legacy template creation. |
| `[/r/{sub}]/api/flairtemplate_v2` | `POST` | `modflair` | Modern template creation (`allowable_content`, `background_color`, `text_color`, `mod_only`, `max_emojis`). |
| `[/r/{sub}]/api/link_flair` / `_v2` | `GET` | `flair` | Retrieves available link flairs for submission. |
| `[/r/{sub}]/api/user_flair` / `_v2` | `GET` | `flair` | Retrieves available user flairs. |
| `[/r/{sub}]/api/selectflair` | `POST` | `flair` | Selects a flair template for link or current user. |
| `[/r/{sub}]/api/setflairenabled` | `POST` | `modflair` | Enables or disables flairs for the subreddit. |

---

## 6. Links & Comments

| Endpoint | Method | Scope | Description & Key Parameters |
| :--- | :--- | :--- | :--- |
| `/api/submit` | `POST` | `submit` | **Publishes posts**. Parameters: `sr`, `kind` (`self`, `link`, `image`, `video`), `title` (max 300), `text` (markdown), `url`, `flair_id`, `nsfw`, `spoiler`, `sendreplies`, `resubmit`. |
| `/api/comment` | `POST` | `submit` / `privatemessages` | Posts comment or message reply. Parameters: `thing_id` (parent fullname `t3_`, `t1_`, `t4_`), `text`. |
| `/api/del` | `POST` | `edit` | Deletes user post or comment. Parameter: `id` (`t3_` or `t1_` fullname). |
| `/api/editusertext` | `POST` | `edit` | Edits body markdown of self-post or comment. Parameters: `thing_id`, `text`. |
| `/api/vote` | `POST` | `vote` | Casts vote on post or comment (`dir`: `1` up, `-1` down, `0` unvote). Parameter: `id`. |
| `/api/save` / `/api/unsave` | `POST` | `save` | Saves or unsaves post/comment for later perusal. Parameter: `id`. |
| `/api/saved_categories` | `GET` | `save` | Lists categories of saved things. |
| `/api/hide` / `/api/unhide` | `POST` | `report` | Hides/unhides posts from user listings. Parameter: `id`. |
| `/api/lock` / `/api/unlock` | `POST` | `modposts` | Locks/unlocks post or comment thread against new replies. Parameter: `id`. |
| `/api/marknsfw` / `/api/unmarknsfw` | `POST` | `modposts` | Marks or unmarks post as NSFW. Parameter: `id`. |
| `/api/spoiler` / `/api/unspoiler` | `POST` | `modposts` | Marks or unmarks post as spoiler. Parameter: `id`. |
| `/api/follow_post` | `POST` | `subscribe` | Follows/unfollows thread updates (`follow`: boolean, `fullname`: `t3_...`). |
| `/api/morechildren` | `GET` | `read` | Expands truncated comment trees ("load more comments"). Parameters: `link_id`, `children` (comma-delimited ID36s), `depth`, `sort`. |
| `/api/report` | `POST` | `report` | Reports content to subreddit moderators/admins. Parameters: `thing_id`, `reason`, `rule_reason`, `site_reason`. |
| `/api/sendreplies` | `POST` | `edit` | Enables/disables inbox notifications for replies on user post/comment (`id`, `state`). |
| `/api/set_contest_mode` | `POST` | `modposts` | Toggles randomized comment contest mode (`id`, `state`). |
| `/api/set_subreddit_sticky` | `POST` | `modposts` | Pins/unpins post to subreddit top slots (`id`, `num`: 1–4, `state`). |
| `/api/set_suggested_sort` | `POST` | `modposts` | Sets default comment sort for thread (`confidence`, `top`, `new`, `qa`, etc.). |
| `/api/info` | `GET` | `read` | Fetch metadata for things by fullnames (`id` comma-separated, or `url`). |

---

## 7. Listings

*All listings support pagination parameters: `after`, `before`, `limit` (max 100), `count`, `show=all`, `sr_detail`.*

| Endpoint | Method | Scope | Description & Key Parameters |
| :--- | :--- | :--- | :--- |
| `/best` | `GET` | `read` | Authenticated user personalized front-page feed. |
| `/hot` or `[/r/{sub}]/hot` | `GET` | `read` | Hot ranking feed. Parameter: `g` (geo location filter). |
| `/new` or `[/r/{sub}]/new` | `GET` | `read` | Chronological newest posts. |
| `/rising` or `[/r/{sub}]/rising` | `GET` | `read` | Fast-trending newer submissions. |
| `/top` or `[/r/{sub}]/top` | `GET` | `read` | Highest voted posts. Parameter: `t` (`hour`, `day`, `week`, `month`, `year`, `all`). |
| `/controversial` | `GET` | `read` | Controversial posts. Parameter: `t`. |
| `/by_id/{names}` | `GET` | `read` | Listing of links by comma-separated fullnames. |
| `[/r/{sub}]/comments/{article}` | `GET` | `read` | Comment tree for link article ID36. Parameters: `comment`, `context` (0–8), `depth`, `sort`. |
| `/duplicates/{article}` | `GET` | `read` | Cross-posted or duplicate submissions of the same link URL. |

---

## 8. Live Threads

| Endpoint | Method | Scope | Description & Key Parameters |
| :--- | :--- | :--- | :--- |
| `/api/live/create` | `POST` | `submit` | Creates live thread (`title`, `description`, `resources`, `nsfw`). |
| `/api/live/{thread}/update` | `POST` | `submit` | Posts real-time update (`body` markdown). |
| `/api/live/{thread}/about` | `GET` | `read` | Thread metadata & **WebSocket connection URL** (`websocket_url`). |
| `/api/live/{thread}/edit` | `POST` | `livemanage` | Modifies thread title, description, resources. |
| `/api/live/{thread}/close_thread` | `POST` | `livemanage` | Permanently closes thread against new updates. |
| `/api/live/{thread}/delete_update`| `POST` | `edit` | Removes specific update (`id`). |
| `/api/live/{thread}/strike_update`| `POST` | `edit` | Strikes out (crosses out) an update as erroneous (`id`). |
| `/api/live/{thread}/invite_contributor` | `POST` | `livemanage` | Invites contributor (`name`, `permissions`: e.g. `+update,+edit,-manage`). |
| `/api/live/{thread}/rm_contributor` | `POST` | `livemanage` | Revokes contributor permissions (`id` account fullname). |
| `/api/live/{thread}/hide_discussion` / `/unhide_...` | `POST` | `livemanage` | Hides/unhides linked reddit submission (`link`). |
| `/live/{thread}` | `GET` | `read` | Listing of updates posted in thread. |
| `/live/{thread}/discussions` | `GET` | `read` | Listing of reddit submissions linked to thread. |

---

## 9. Private Messages

| Endpoint | Method | Scope | Description & Key Parameters |
| :--- | :--- | :--- | :--- |
| `/api/compose` | `POST` | `privatemessages` | Sends PM. Parameters: `to`, `subject` (max 100), `text`, `from_sr` (optional modmail sender). |
| `/message/inbox` | `GET` | `privatemessages` | User inbox messages listing. |
| `/message/unread` | `GET` | `privatemessages` | Unread messages listing. |
| `/message/sent` | `GET` | `privatemessages` | Sent messages listing. |
| `/api/read_message` | `POST` | `privatemessages` | Marks messages read. Parameter: `id` (comma-separated fullnames). |
| `/api/read_all_messages` | `POST` | `privatemessages` | Queues bulk mark-all-read action (returns HTTP 202). |
| `/api/del_msg` | `POST` | `privatemessages` | Deletes message from recipient inbox view (`id`). |

---

## 10. Misc & Scopes

| Endpoint | Method | Scope | Description & Key Parameters |
| :--- | :--- | :--- | :--- |
| `/api/v1/scopes` | `GET` | `any` | Returns descriptions and capabilities of all Reddit OAuth2 scopes. |

---

## 11. Moderation

| Endpoint | Method | Scope | Description & Key Parameters |
| :--- | :--- | :--- | :--- |
| `[/r/{sub}]/about/log` | `GET` | `modlog` | Moderation audit log. Parameters: `mod` filter, `type` (e.g. `banuser`, `removelink`, `approvelink`, `sticky`, etc.). |
| `[/r/{sub}]/about/{location}` | `GET` | `read` | Mod listings: `/about/reports`, `/about/spam`, `/about/modqueue`, `/about/unmoderated`, `/about/edited`. |
| `/api/approve` | `POST` | `modposts` | Approves reported/removed link or comment (`id`). |
| `/api/remove` | `POST` | `modposts` | Removes link or comment (`id`, `spam`: boolean). |
| `/api/distinguish` | `POST` | `modposts` | Distinguishes author with moderator `[M]` or admin `[A]` sigil (`how`, `sticky`). |
| `/api/ignore_reports` / `/unignore_...` | `POST` | `modposts` | Prevents/allows future user reports from raising notifications (`id`). |
| `/api/snooze_reports` / `/unsnooze_...` | `POST` | `modposts` | Snoozes reports for 7 days from specific users (`id`, `reason`). |
| `/api/update_crowd_control_level` | `POST` | `modposts` | Adjusts crowd control filtering level on thread (0–3). |
| `/api/show_comment` | `POST` | `modposts` | Uncollapses crowd-controlled comment (`id`). |
| `[/r/{sub}]/api/accept_moderator_invite` | `POST` | `modself` | Accepts pending invitation to moderate subreddit. |
| `/api/leavemoderator` | `POST` | `modself` | Resigns moderator status from subreddit (`id`). |
| `/api/leavecontributor` | `POST` | `modself` | Resigns approved submitter status from subreddit (`id`). |
| `[/r/{sub}]/stylesheet` | `GET` | `modconfig` | Redirects to active custom CSS stylesheet. |

---

## 12. New Modmail

| Endpoint | Method | Scope | Description & Key Parameters |
| :--- | :--- | :--- | :--- |
| `/api/mod/conversations` | `GET` | `modmail` | Fetches modmail threads (`entity` subreddit list, `state`, `sort`, `limit`). |
| `/api/mod/conversations` | `POST` | `modmail` | Starts new modmail conversation (`srName`, `to`, `subject`, `body`, `isAuthorHidden`). |
| `/api/mod/conversations/:id` | `GET` | `modmail` | Retrieves complete conversation messages, mod actions, and metadata. |
| `/api/mod/conversations/:id` | `POST` | `modmail` | Replies to conversation (`body`, `isInternal` mod note flag, `isAuthorHidden`). |
| `/api/mod/conversations/:id/approve` | `POST` | `modmail` | Approves user associated with conversation. |
| `/api/mod/conversations/:id/disapprove` | `POST` | `modmail` | Disapproves user associated with conversation. |
| `/api/mod/conversations/:id/archive` | `POST` | `modmail` | Archives conversation thread. |
| `/api/mod/conversations/:id/unarchive` | `POST` | `modmail` | Unarchives conversation thread. |
| `/api/mod/conversations/:id/highlight` | `POST` / `DELETE` | `modmail` | Highlights or unhighlights conversation thread. |
| `/api/mod/conversations/:id/mute` | `POST` | `modmail` | Mutes user for 72, 168, or 672 hours (`num_hours`). |
| `/api/mod/conversations/:id/unmute` | `POST` | `modmail` | Unmutes user. |
| `/api/mod/conversations/:id/temp_ban` | `POST` | `modmail` | Converts ban to temporary ban (`duration` 1–999 days). |
| `/api/mod/conversations/:id/unban` | `POST` | `modmail` | Unbans user from subreddit. |
| `/api/mod/conversations/read` / `/unread` | `POST` | `modmail` | Marks list of conversation IDs as read or unread. |
| `/api/mod/conversations/unread/count` | `GET` | `modmail` | Returns count of unread modmail messages across categories. |
| `/api/mod/conversations/subreddits` | `GET` | `modmail` | Lists subreddits user moderates with mail permission. |
| `/api/mod/bulk_read` | `POST` | `modmail` | Bulk marks all conversations read for subreddits & state. |

---

## 13. Mod Notes

| Endpoint | Method | Scope | Description & Key Parameters |
| :--- | :--- | :--- | :--- |
| `/api/mod/notes` | `GET` | `modnote` | Retrieves moderator notes for user in subreddit (`subreddit`, `user`, `filter`, `limit`). |
| `/api/mod/notes` | `POST` | `modnote` | Creates mod note. Parameters: `subreddit`, `user`, `note` (max 250), `label` (`HELPFUL_USER`, `SOLID_CONTRIBUTOR`, `SPAM_WATCH`, `ABUSE_WARNING`, `BAN`, etc.), `reddit_id` (`t1_` or `t3_`). |
| `/api/mod/notes` | `DELETE` | `modnote` | Deletes mod note (`note_id`, `subreddit`, `user`). |
| `/api/mod/notes/recent` | `GET` | `modnote` | Bulk fetches recent notes for paired lists of `subreddits` and `users` (up to 500 pairs). |

---

## 14. Multis (Custom Feeds)

| Endpoint | Method | Scope | Description & Key Parameters |
| :--- | :--- | :--- | :--- |
| `/api/multi/mine` | `GET` | `read` | Fetches custom feeds belonging to current user. |
| `/api/multi/user/{username}` | `GET` | `read` | Fetches public custom feeds of target user. |
| `/api/multi/{multipath}` | `GET` | `read` | Fetches multi definition & subreddits list. |
| `/api/multi/{multipath}` | `POST` / `PUT` | `subscribe` | Creates or updates multi with JSON model (`display_name`, `description_md`, `visibility`, `subreddits`, `icon_img`, `key_color`). |
| `/api/multi/{multipath}` | `DELETE` | `subscribe` | Deletes custom feed (`multipath`). |
| `/api/multi/copy` | `POST` | `subscribe` | Clones multi to new path (`from`, `to`, `display_name`). |
| `/api/multi/{multipath}/description` | `GET` / `PUT` | `read` | Gets or updates markdown description of multi (`body_md`). |
| `/api/multi/{multipath}/r/{srname}` | `PUT` / `DELETE` | `subscribe` | Adds or removes a subreddit from a multi (`name`). |

---

## 15. Search

| Endpoint | Method | Scope | Description & Key Parameters |
| :--- | :--- | :--- | :--- |
| `[/r/{sub}]/search` | `GET` | `read` | Searches submissions. Parameters: `q` (query string, max 512), `sort` (`relevance`, `hot`, `top`, `new`, `comments`), `t` (time range), `restrict_sr` (boolean), `type` (`sr`, `link`, `user`). |
| `/subreddits/search` | `GET` | `read` | Searches subreddits by title & description (`q`, `sort`, `show_users`). |
| `/users/search` | `GET` | `read` | Searches user profiles by title & description (`q`, `sort`). |

---

## 16. Subreddits

| Endpoint | Method | Scope | Description & Key Parameters |
| :--- | :--- | :--- | :--- |
| `/r/{subreddit}/about` | `GET` | `read` | Fetches subreddit metadata (subscribers, active accounts, rules, icon, banner). |
| `/r/{subreddit}/about/rules` | `GET` | `read` | **Fetches community rules** and report reasons. |
| `/api/v1/{subreddit}/post_requirements` | `GET` | `submit` | **Fetches submission requirements**: title min/max length, required strings, blacklists, mandatory flair flags (`is_flair_required`). |
| `/r/{subreddit}/about/traffic` | `GET` | `modconfig` | Pageview & unique visitor analytics. |
| `/api/subscribe` | `POST` | `subscribe` | Subscribes or unsubscribes (`action`: `sub`/`unsub`, `sr_name`). |
| `/subreddits/mine/{where}` | `GET` | `mysubreddits` | Listing of user's subreddits: `/subscriber`, `/contributor`, `/moderator`, `/streams`. |
| `/subreddits/{where}` | `GET` | `read` | Directory: `/popular`, `/new`, `/default`, `/gold`. |
| `/api/search_reddit_names` | `GET` / `POST` | `read` | Fast autocomplete matching for subreddit names (`query`, `exact`, `include_over_18`). |
| `/api/subreddit_autocomplete_v2` | `GET` | `read` | Enhanced typeahead search returning metadata & suggestions (`query`, `limit`: 1–10). |
| `/api/submit_text` | `GET` | `submit` | Gets markdown submission sidebar guidelines. |
| `[/r/{sub}]/sidebar` | `GET` | `read` | Gets subreddit raw sidebar text. |
| `[/r/{sub}]/sticky` | `GET` | `read` | Redirects to currently stickied post (`num`: 1 or 2). |
| `/api/site_admin` | `POST` | `modconfig` | Creates or modifies subreddit settings (`title`, `public_description`, `type`, `spam_comments`, `crowd_control_level`, `allow_images`, etc.). |
| `/api/upload_sr_img` | `POST` | `modconfig` | Uploads subreddit asset (`upload_type`: `img`, `header`, `icon`, `banner`, `file` max 500 KiB). |
| `/api/delete_sr_img` / `_header` / `_icon` / `_banner` | `POST` | `modconfig` | Deletes custom asset styling. |
| `/api/subreddit_stylesheet` | `POST` | `modconfig` | Updates CSS stylesheet (`op`: `save`/`preview`, `stylesheet_contents`). |

---

## 17. Users

| Endpoint | Method | Scope | Description & Key Parameters |
| :--- | :--- | :--- | :--- |
| `/user/{username}/about` | `GET` | `read` | Public user profile information, total karma, verified status. |
| `/user/{username}/{where}` | `GET` | `history` | User activity feeds: `/overview`, `/submitted`, `/comments`, `/upvoted`, `/downvoted`, `/hidden`, `/saved`, `/gilded`. |
| `/user/{username}/trophies` | `GET` | `read` | Lists trophies displayed on user profile. |
| `/api/username_available` | `GET` | `any` | Checks registration availability for a proposed username (`user`). |
| `/api/block_user` | `POST` | `account` | Blocks user account (`account_id`, `name`). |
| `/api/report_user` | `POST` | `report` | Reports user to Reddit administration (`user`, `reason`, `details`). |
| `/api/v1/me/friends/{username}` | `PUT` / `DELETE` | `subscribe` | Adds, notes, or removes friend relationship (`name`, `note` max 300). |
| `[/r/{sub}]/api/friend` | `POST` | `modcontributors` / `modothers` | Sets user role: `moderator`, `moderator_invite`, `contributor`, `banned`, `muted`, `wikibanned`. |
| `[/r/{sub}]/api/unfriend` | `POST` | `modcontributors` / `modothers` | Removes role / unbans / unmutes user from subreddit. |
| `[/r/{sub}]/api/setpermissions` | `POST` | `modothers` | Configures granular moderator permission flags. |
| `/api/user_data_by_account_ids` | `GET` | `privatemessages` | Batch retrieves usernames for `t2_` account fullnames (`ids`). |

---

## 18. Widgets (Subreddit Structured Sidebars)

| Endpoint | Method | Scope | Description & Key Parameters |
| :--- | :--- | :--- | :--- |
| `[/r/{sub}]/api/widgets` | `GET` | `structuredstyles` | Retrieves all sidebar widgets, order, and configuration. |
| `[/r/{sub}]/api/widget` | `POST` | `structuredstyles` | Adds widget. JSON shape by `kind`: `textarea`, `button`, `image`, `calendar`, `community-list`, `post-flair`, `custom`, `menu`, `id-card`, `moderators`. |
| `[/r/{sub}]/api/widget/{widget_id}` | `PUT` | `structuredstyles` | Updates existing widget data & styling. |
| `[/r/{sub}]/api/widget/{widget_id}` | `DELETE` | `structuredstyles` | Deletes widget from sidebar. |
| `[/r/{sub}]/api/widget_order/{section}` | `PATCH` | `structuredstyles` | Reorders widget array IDs in `sidebar`. |
| `[/r/{sub}]/api/widget_image_upload_s3` | `POST` | `structuredstyles` | Gets upload credentials & lease for widget image (`filepath`, `mimetype`). |

---

## 19. Wiki

| Endpoint | Method | Scope | Description & Key Parameters |
| :--- | :--- | :--- | :--- |
| `[/r/{sub}]/wiki/pages` | `GET` | `wikiread` | Lists all wiki pages in subreddit. |
| `[/r/{sub}]/wiki/{page}` | `GET` | `wikiread` | Returns content of wiki page. Parameters: `v` (revision ID), `v2` (diff comparison). |
| `[/r/{sub}]/wiki/revisions` / `/{page}` | `GET` | `wikiread` | Revision history listing for wiki. |
| `[/r/{sub}]/wiki/discussions/{page}` | `GET` | `wikiread` | Submissions discussing specific wiki page. |
| `[/r/{sub}]/wiki/edit` | `POST` | `wikiedit` | Creates or updates wiki page (`page`, `content` markdown, `previous`, `reason`). |
| `[/r/{sub}]/wiki/revert` | `POST` | `modwiki` | Reverts wiki page to prior revision (`revision`). |
| `[/r/{sub}]/wiki/hide` | `POST` | `modwiki` | Toggles public visibility of specific revision. |
| `[/r/{sub}]/wiki/settings/{page}` | `GET` / `POST` | `modwiki` | Inspects or sets page permissions (`permlevel`, `listed`). |
| `[/r/{sub}]/api/wiki/alloweditor/{act}` | `POST` | `modwiki` | Adds or revokes individual user editing permissions (`act`: `add`/`del`, `username`). |

---

## 20. Protocol Essentials Quick Sheet

```http
# 1. Access Token Request (Script Application)
POST https://www.reddit.com/api/v1/access_token
Authorization: Basic base64(CLIENT_ID:CLIENT_SECRET)
Content-Type: application/x-www-form-urlencoded

grant_type=password&username=YOUR_USERNAME&password=YOUR_PASSWORD

# 2. Authenticated API Request
GET https://oauth.reddit.com/r/writing/hot?limit=25&raw_json=1
Authorization: Bearer YOUR_ACCESS_TOKEN
User-Agent: web:writon-publisher:v2.0.0 (by /u/writon_official)

# 3. Post Submission
POST https://oauth.reddit.com/api/submit?raw_json=1
Authorization: Bearer YOUR_ACCESS_TOKEN
User-Agent: web:writon-publisher:v2.0.0 (by /u/writon_official)
Content-Type: application/x-www-form-urlencoded

api_type=json&sr=writing&kind=self&title=Crafting+Memorable+Prose&text=Your+body+content...
```
