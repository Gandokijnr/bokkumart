import { computed, type ComputedRef, type Ref } from "vue";

type FulfillmentMode = "pickup" | "delivery" | null | undefined;

type MaybeRef<T> = Ref<T> | ComputedRef<T>;

export function useFees(opts: {
  subtotal: MaybeRef<number>;
  fulfillmentMode: MaybeRef<FulfillmentMode>;
  pickupFee?: number;
  deliveryRate?: number;
}) {
  const pickupFee = Number(opts.pickupFee ?? 500);
  const deliveryRate = Number(opts.deliveryRate ?? 0.025);

  const serviceFee = computed(() => {
    const mode = opts.fulfillmentMode.value;
    const subtotal = Number(opts.subtotal.value || 0);

    if (mode === "pickup") return pickupFee;
    return Math.round(subtotal * deliveryRate);
  });

  const serviceFeeKobo = computed(() => Math.round(serviceFee.value * 100));

  return {
    serviceFee,
    serviceFeeKobo,
  };
}
