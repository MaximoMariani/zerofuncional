/**
 * ─────────────────────────────────────────────────────────────────
 *  TIENDANUBE INTEGRATION — TYPES / INTERFACES
 *  ⚠️  THIS FILE IS A STUB. No real API calls are made here.
 *
 *  PROGRAMMER: Replace these JSDoc types with real Tiendanube API
 *  shapes once you implement the integration.
 *  Ref: https://tiendanube.github.io/api-documentation/resources/order
 * ─────────────────────────────────────────────────────────────────
 */

/**
 * @typedef {Object} TiendanubeCustomer
 * @property {number} id
 * @property {string} name
 * @property {string} email
 * @property {string} phone
 */

/**
 * @typedef {Object} TiendanubeLineItem
 * @property {number}  id
 * @property {string}  name
 * @property {string}  sku
 * @property {number}  quantity
 * @property {number}  price
 * @property {string|null} barcode  — map from product variant
 */

/**
 * @typedef {Object} TiendanubeOrder
 * @property {number}                 id
 * @property {string}                 number       — display order number
 * @property {string}                 status       — "open" | "closed" | "cancelled"
 * @property {string}                 payment_status
 * @property {string}                 shipping_status
 * @property {TiendanubeCustomer}     customer
 * @property {TiendanubeLineItem[]}   products
 * @property {string}                 created_at   — ISO 8601
 * @property {string}                 updated_at   — ISO 8601
 */

module.exports = {}; // types only, nothing to export at runtime
