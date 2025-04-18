import { nanoid } from "nanoid"

// Generate unique IDs for different entities
export default {
  generateUserId: () => `user-${nanoid(10)}`,
  generateFieldId: () => `field-${nanoid(10)}`,
  generateImageId: () => `img-${nanoid(10)}`,
  generateBookingId: () => `booking-${nanoid(10)}`,
  generatePaymentId: () => `payment-${nanoid(10)}`,
  generatePointId: () => `point-${nanoid(10)}`,
  generateProgramId: () => `program-${nanoid(10)}`,
  generateRedemptionId: () => `redemption-${nanoid(10)}`,
  generateNotificationId: () => `notif-${nanoid(10)}`,
  generateSubscriptionId: () => `sub-${nanoid(10)}`,
  generateRedemptionCode: (prefix) => `${prefix}-${nanoid(6).toUpperCase()}`,
}
