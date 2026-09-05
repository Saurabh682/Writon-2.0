import { z } from 'zod';

const engagementPreferencesSchema = z.object({
  primaryIntent: z.enum(['read', 'write', 'both']).nullable(),
  onboardingVersion: z.number().int().min(0).max(1_000),
  onboardingCompletedAt: z.string().datetime({ offset: true }).nullable(),
  preferenceCardState: z.enum(['unseen', 'dismissed', 'completed']),
}).strict();

const defaultPreferences = Object.freeze({
  primaryIntent: null,
  onboardingVersion: 0,
  onboardingCompletedAt: null,
  preferenceCardState: 'unseen',
  preferenceCardUpdatedAt: null,
});

export async function engagementPreferenceRoutes(
  fastify,
  { database, requireUser, ensureProfile = async () => {} },
) {
  fastify.get(
    '/api/v1/me/engagement-preferences',
    { preHandler: requireUser },
    async (request) => {
      await ensureProfile(request);
      const result = await database.query(
        `select primary_intent as "primaryIntent",
                onboarding_version as "onboardingVersion",
                onboarding_completed_at as "onboardingCompletedAt",
                preference_card_state as "preferenceCardState",
                preference_card_updated_at as "preferenceCardUpdatedAt"
           from public.profile_engagement_preferences
          where profile_id = $1`,
        [request.profileId],
      );
      return result.rows[0] ?? defaultPreferences;
    },
  );

  fastify.put(
    '/api/v1/me/engagement-preferences',
    { preHandler: requireUser },
    async (request, reply) => {
      const parsed = engagementPreferencesSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({
          error: 'Invalid engagement preferences',
          details: parsed.error.flatten().fieldErrors,
        });
      }
      await ensureProfile(request);
      const value = parsed.data;
      const result = await database.query(
        `insert into public.profile_engagement_preferences (
           profile_id, primary_intent, onboarding_version, onboarding_completed_at,
           preference_card_state, preference_card_updated_at, updated_at
         ) values (
           $1, $2, $3, $4::timestamptz, $5,
           case when $5 = 'unseen' then null else now() end, now()
         )
         on conflict (profile_id) do update
           set primary_intent = excluded.primary_intent,
               onboarding_version = excluded.onboarding_version,
               onboarding_completed_at = excluded.onboarding_completed_at,
               preference_card_updated_at = case
                 when public.profile_engagement_preferences.preference_card_state
                      is distinct from excluded.preference_card_state
                 then now()
                 else public.profile_engagement_preferences.preference_card_updated_at
               end,
               preference_card_state = excluded.preference_card_state,
               updated_at = now()
         returning primary_intent as "primaryIntent",
                   onboarding_version as "onboardingVersion",
                   onboarding_completed_at as "onboardingCompletedAt",
                   preference_card_state as "preferenceCardState",
                   preference_card_updated_at as "preferenceCardUpdatedAt"`,
        [
          request.profileId,
          value.primaryIntent,
          value.onboardingVersion,
          value.onboardingCompletedAt,
          value.preferenceCardState,
        ],
      );
      return result.rows[0];
    },
  );
}
