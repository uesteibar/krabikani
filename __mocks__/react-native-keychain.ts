const storage: Map<string, { username: string; password: string }> = new Map();

export const setGenericPassword = jest.fn(
  async (
    username: string,
    password: string,
    options?: { service?: string },
  ): Promise<boolean> => {
    const service = options?.service || 'default';
    storage.set(service, { username, password });
    return true;
  },
);

export const getGenericPassword = jest.fn(
  async (options?: {
    service?: string;
  }): Promise<{ username: string; password: string } | false> => {
    const service = options?.service || 'default';
    const credentials = storage.get(service);
    return credentials || false;
  },
);

export const resetGenericPassword = jest.fn(
  async (options?: { service?: string }): Promise<boolean> => {
    const service = options?.service || 'default';
    storage.delete(service);
    return true;
  },
);

export const __clearMockStorage = () => {
  storage.clear();
};

export default {
  setGenericPassword,
  getGenericPassword,
  resetGenericPassword,
};
