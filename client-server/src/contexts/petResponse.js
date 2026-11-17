export function petResponseView(state, taskCelebrating, moodAction) {
  const comfort = !taskCelebrating && moodAction === 'comfort_all_five';
  const moodCelebrating = !taskCelebrating && moodAction === 'celebrate_selected';
  return { comfort, moodCelebrating, state: taskCelebrating || moodCelebrating ? 'celebrate' : state };
}
