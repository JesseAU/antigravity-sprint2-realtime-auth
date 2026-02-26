import { supabase } from '../lib/supabase/client';
import { validateSwipe, isMutualMatch } from '../lib/utils/match-rules';

/**
 * Service for handling matching and swipe operations.
 */
export const MatchService = {
    /**
     * Records a swipe and checks for a mutual match.
     */
    async recordSwipe(targetId, vote) {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('User not authenticated');

            const swipeData = { userId: user.id, targetId, vote };

            // Domain validation
            const validation = validateSwipe(swipeData);
            if (!validation.valid) throw new Error(validation.error);

            // 1. Record the swipe
            const { error: swipeError } = await supabase
                .from('swipes')
                .upsert([
                    { user_id: user.id, target_id: targetId, vote }
                ], { onConflict: 'user_id, target_id' });

            if (swipeError) throw swipeError;

            // 2. Check for reciprocal like (only if we liked)
            if (vote === true) {
                const { data: reciprocalSwipe } = await supabase
                    .from('swipes')
                    .select('*')
                    .eq('user_id', targetId)
                    .eq('target_id', user.id)
                    .eq('vote', true)
                    .maybeSingle();

                if (reciprocalSwipe) {
                    // Mutual match!
                    return await this.createMatch(user.id, targetId);
                }
            }

            return { success: true, matched: false };
        } catch (error) {
            console.error('MatchService.recordSwipe failure:', error);
            return { success: false, error: error.message };
        }
    },

    /**
     * Creates a match entry.
     */
    async createMatch(userA, userB, roomId = null) {
        try {
            // Sort to prevent duplicates (userA < userB)
            const [first, second] = [userA, userB].sort();

            const { data, error } = await supabase
                .from('matches')
                .insert([
                    { user_a: first, user_b: second, room_id: roomId }
                ])
                .select()
                .single();

            if (error && error.code !== '23505') throw error; // Ignore unique constraint error

            return { success: true, matched: true, data };
        } catch (error) {
            console.error('MatchService.createMatch failure:', error);
            return { success: false, error: error.message };
        }
    },

    /**
     * Subscribes to new matches.
     */
    subscribeToMatches(callback) {
        return supabase
            .channel('public:matches')
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'matches'
            }, (payload) => {
                callback(payload.new);
            })
            .subscribe();
    }
};
