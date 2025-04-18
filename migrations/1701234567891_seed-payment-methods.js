/* eslint-disable camelcase */

export const shorthands = undefined

export async function up(pgm) {
  // Insert default payment methods
  pgm.sql(`
    INSERT INTO payment_methods (method_name, is_active) VALUES
    ('credit_card', true),
    ('bank_transfer', true),
    ('cash', true),
    ('e_wallet', true)
  `)
}

export async function down(pgm) {
  pgm.sql(`DELETE FROM payment_methods WHERE method_name IN ('credit_card', 'bank_transfer', 'cash', 'e_wallet')`)
}
