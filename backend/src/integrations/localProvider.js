/**
 * Local integration provider.
 * Used when INTEGRATION_PROVIDER=local (default).
 * Orders are managed entirely within ZERO — no external API.
 */

const localProvider = {
  async fetchOrders(_params = {}) {
    // Local: orders come from the DB, not an external source
    return [];
  },

  async markPacked(_orderId) {
    // Local: no external system to notify
  },
};

module.exports = localProvider;
