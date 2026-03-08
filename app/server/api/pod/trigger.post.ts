export default defineEventHandler(async (event) => {
  throw createError({
    statusCode: 403,
    statusMessage: "POD is currently disabled.",
  });

  const body = await readBody(event);
  const { order_id, phone, user_name } = body;

  if (!order_id || !phone) {
    throw createError({
      statusCode: 400,
      statusMessage: "Order ID and phone number required",
    });
  }

  console.log(
    `[POD] Manual call confirmation queued for order ${order_id}. Customer: ${user_name}, Phone: ${phone}`,
  );

  return {
    success: true,
    message:
      "Call confirmation request logged. A representative will contact the customer shortly.",
    order_id,
    customer_phone: phone,
    status: "pending_representative_call",
  };
});
