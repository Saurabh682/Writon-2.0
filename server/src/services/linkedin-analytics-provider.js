/**
 * LinkedIn Analytics Provider
 *
 * Implements:
 * - MemberPostAnalyticsProvider (/rest/memberCreatorPostAnalytics)
 * - MemberVideoAnalyticsProvider (/rest/memberCreatorVideoAnalytics)
 * - OrganizationShareAnalyticsProvider (/rest/organizationalEntityShareStatistics)
 *
 * Preserves nullability for unsupported/missing metrics.
 */

export class MemberPostAnalyticsProvider {
  constructor(client) {
    this.client = client;
  }

  async getPostMetrics(postUrn) {
    try {
      const url = `https://api.linkedin.com/rest/memberCreatorPostAnalytics?postUrn=${encodeURIComponent(postUrn)}`;
      const res = await this.client.request(url);
      if (!res.ok) return null;
      const data = await res.json();

      return {
        surface: 'MEMBER_CREATOR_POST',
        impressions: data.elements?.[0]?.impressionCount ?? null,
        uniqueMembersReached: data.elements?.[0]?.membersReachedCount ?? null,
        reactions: data.elements?.[0]?.reactionCount ?? null,
        comments: data.elements?.[0]?.commentCount ?? null,
        reshares: data.elements?.[0]?.repostCount ?? null,
        saves: data.elements?.[0]?.saveCount ?? null,
        sends: data.elements?.[0]?.sendCount ?? null,
        clicks: data.elements?.[0]?.linkClickCount ?? null,
        rawResponse: data,
      };
    } catch {
      return null;
    }
  }
}

export class OrganizationShareAnalyticsProvider {
  constructor(client) {
    this.client = client;
  }

  async getShareMetrics(shareUrn) {
    try {
      const url = `https://api.linkedin.com/rest/organizationalEntityShareStatistics?shares=List(${encodeURIComponent(shareUrn)})`;
      const res = await this.client.request(url);
      if (!res.ok) return null;
      const data = await res.json();
      const stats = data.elements?.[0]?.totalShareStatistics;

      return {
        surface: 'ORGANIZATIONAL_SHARE',
        impressions: stats?.impressionCount ?? null,
        uniqueMembersReached: stats?.uniqueImpressionsCount ?? null,
        reactions: stats?.likeCount ?? null,
        comments: stats?.commentCount ?? null,
        reshares: stats?.shareCount ?? null,
        clicks: stats?.clickCount ?? null,
        engagementRate: stats?.engagement ?? null,
        rawResponse: data,
      };
    } catch {
      return null;
    }
  }
}

export class MemberVideoAnalyticsProvider {
  constructor(client) {
    this.client = client;
  }

  async getVideoMetrics(videoUrn) {
    try {
      const url = `https://api.linkedin.com/rest/memberCreatorVideoAnalytics?videoUrn=${encodeURIComponent(videoUrn)}`;
      const res = await this.client.request(url);
      if (!res.ok) return null;
      const data = await res.json();

      return {
        surface: 'MEMBER_CREATOR_VIDEO',
        impressions: data.elements?.[0]?.impressionCount ?? null,
        videoViews: data.elements?.[0]?.videoViewsCount ?? null,
        reactions: data.elements?.[0]?.reactionCount ?? null,
        comments: data.elements?.[0]?.commentCount ?? null,
        reshares: data.elements?.[0]?.repostCount ?? null,
        rawResponse: data,
      };
    } catch {
      return null;
    }
  }
}
