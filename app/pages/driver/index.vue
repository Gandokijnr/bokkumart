<script setup lang="ts">
definePageMeta({
  middleware: 'driver',
  layout: false
})

await navigateTo('/driver/dashboard')
</script>
