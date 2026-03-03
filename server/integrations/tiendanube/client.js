/**
 * ─────────────────────────────────────────────────────────────────
 *  TIENDANUBE INTEGRATION — CLIENT MOCK
 *  ⚠️  ALL METHODS ARE STUBS. This file returns mock/empty data.
 *
 *  PROGRAMMER: To integrate Tiendanube:
 *  1. Set INTEGRATION_PROVIDER=tiendanube in your .env
 *  2. Add TIENDANUBE_STORE_ID and TIENDANUBE_ACCESS_TOKEN to .env
 *  3. Replace each method body with real fetch() calls to:
 *       https://api.tiendanube.com/v1/{store_id}/orders
 *     Ref: https://tiendanube.github.io/api-documentation/resources/order
 *  4. Map TiendanubeOrder → local Order shape in mapOrder() below
 * ─────────────────────────────────────────────────────────────────
 */

class TiendanubeClient {
  constructor() {
    this.storeId = process.env.TIENDANUBE_STORE_ID || '';
    this.accessToken = process.env.TIENDANUBE_ACCESS_TOKEN || '';
    this.baseUrl = `https://api.tiendanube.com/v1/${this.storeId}`;
  }

  /**
   * Fetch orders from Tiendanube.
   * STUB — returns empty array.
   *
   * @param {{ page?: number, per_page?: number, status?: string }} params
   * @returns {Promise<import('./types').TiendanubeOrder[]>}
   *
   * PROGRAMMER: Implement like:
   *   const res = await fetch(`${this.baseUrl}/orders?page=${params.page}&per_page=${params.per_page}`, {
   *     headers: { 'Authentication': `bearer ${this.accessToken}` }
   *   });
   *   return res.json();
   */
  // eslint-disable-next-line no-unused-vars
  async fetchOrders(_params = {}) {
    // TODO: implement real Tiendanube API call
    return [];
  }

  /**
   * Mark an order as packed/fulfilled in Tiendanube.
   * STUB — does nothing.
   *
   * @param {number|string} orderId — Tiendanube external order id
   * @returns {Promise<void>}
   *
   * PROGRAMMER: Implement like:
   *   await fetch(`${this.baseUrl}/orders/${orderId}/fulfill`, {
   *     method: 'POST',
   *     headers: {
   *       'Authentication': `bearer ${this.accessToken}`,
   *       'Content-Type': 'application/json',
   *     },
   *   });
   */
  // eslint-disable-next-line no-unused-vars
  async markPacked(_orderId) {
    // TODO: implement real Tiendanube API call
  }

  /**
   * Map a Tiendanube order to the local ZERO order shape.
   * PROGRAMMER: Adjust field mapping to match actual API response.
   *
   * @param {import('./types').TiendanubeOrder} tnOrder
   * @returns {object} local order shape
   */
  mapOrder(tnOrder) {
    return {
      external_id: String(tnOrder.id),
      customer_name: tnOrder.customer?.name || 'Unknown',
      customer_email: tnOrder.customer?.email || null,
      status: 'pending',
      items: (tnOrder.products || []).map((p) => ({
        sku: p.sku || String(p.id),
        barcode: p.barcode || null,
        name: p.name,
        quantity: p.quantity,
      })),
    };
  }
}

module.exports = new TiendanubeClient();
