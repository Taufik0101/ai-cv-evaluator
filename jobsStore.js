const store = new Map();
module.exports = {
  create(job) {
    store.set(job.id, {...job, updatedAt: Date.now()});
    return job;
  },
  update(id, patch) {
    const ex = store.get(id);
    if (!ex) return null;
    const up = {...ex, ...patch, updatedAt: Date.now()};
    store.set(id, up);
    return up;
  },
  get(id) {
    return store.get(id);
  },
};
