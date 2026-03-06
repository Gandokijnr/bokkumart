import { defineEventHandler, createError } from "h3";

export default defineEventHandler(async () => {
  throw createError({
    statusCode: 410,
    statusMessage:
      "Disabled: inventory finalization must be completed in RetailMan POS",
  });
});
