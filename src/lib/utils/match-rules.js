/**
 * Pure domain logic for matching system.
 */

/**
 * Validates if a swipe object contains all required fields.
 */
export const validateSwipe = (swipe) => {
    if (!swipe.userId) return { valid: false, error: 'Missing userId' };
    if (!swipe.targetId) return { valid: false, error: 'Missing targetId' };
    if (typeof swipe.vote !== 'boolean') return { valid: false, error: 'Invalid vote (must be boolean)' };
    return { valid: true };
};

/**
 * Determines if a mutual match exists based on current and existing swipes.
 */
export const isMutualMatch = (currentSwipe, reciprocalSwipe) => {
    if (!reciprocalSwipe) return false;
    return currentSwipe.vote === true && reciprocalSwipe.vote === true;
};
