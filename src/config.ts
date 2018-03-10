export interface Config {
  githubAccessToken: string;
  circleApiToken: string;
  triggerWord: string;
  allowedJobs?: string;
}

export const loadConfig = (): Config => {
  if (typeof process.env.GITHUB_ACCESS_TOKEN !== 'string') {
    throw new Error('GITHUB_ACCESS_TOKEN is not set');
  }

  if (typeof process.env.CIRCLE_API_TOKEN !== 'string') {
    throw new Error('CIRCLE_API_TOKEN is not set');
  }

  if (typeof process.env.GH_CIRCLE_TRIGGER_TRIGGER_WORD !== 'string') {
    throw new Error('GH_CIRCLE_TRIGGER_TRIGGER_WORD is not set');
  }

  return {
    githubAccessToken: process.env.GITHUB_ACCESS_TOKEN,
    circleApiToken: process.env.CIRCLE_API_TOKEN,
    triggerWord: process.env.GH_CIRCLE_TRIGGER_TRIGGER_WORD,
    allowedJobs: process.env.GH_CIRCLE_TRIGGER_ALLOWED_JOBS,
  };
};
