const FUELS = {
  ds: 'ds',
  dsp: 'dsp',
  a92: 'a92',
  a95: 'a95',
  a95p: 'a95p',
  gs: 'gs'
}
const FUEL_NAMES = {
  [FUELS.ds]: 'Diesel',
  [FUELS.dsp]: 'Diesel Premium',
  [FUELS.a92]: 'A92',
  [FUELS.a95]: 'A95',
  [FUELS.a95p]: 'A95 Premium',
  [FUELS.gs]: 'Gas',
}

const MEANS = {
  cash: 'cash',
  brand_wallet: 'brand_wallet',
  coupon: 'coupon',
  fuel_card: 'fuel_card',
  special_transport: 'special_transport'
}

const MEAN_NAMES = {
  [MEANS.cash]: 'Cash & Card',
  [MEANS.brand_wallet]: 'Brand Wallet',
  [MEANS.coupon]: 'Coupons',
  [MEANS.fuel_card]: 'Fuel Card',
  [MEANS.special_transport]: 'Special Transport'
}

module.exports = {
  FUELS,
  FUEL_NAMES,
  MEANS,
  MEAN_NAMES
}

