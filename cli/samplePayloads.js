import { randomUUID } from 'crypto';

// All valid commodities from OPA
export const COMMODITIES = [
  'WTI_USD',
  'BRENT_CRUDE_USD',
  'NATURAL_GAS_USD',
  'NATURAL_GAS_GBP',
  'COAL_USD',
  'GOLD_USD',
  'GBP_USD',
  'EUR_USD',
  'DUBAI_CRUDE_USD',
  'DUTCH_TTF_EUR',
  'MGO_05S_USD',
  'VLSFO_USD',
  'HFO_380_USD',
  'HFO_180_USD'
];

// Commodity metadata
const COMMODITY_INFO = {
  WTI_USD: { name: 'West Texas Intermediate', unit: 'barrel', currency: 'USD', basePrice: 75 },
  BRENT_CRUDE_USD: { name: 'Brent Crude', unit: 'barrel', currency: 'USD', basePrice: 78 },
  NATURAL_GAS_USD: { name: 'Natural Gas', unit: 'MMBtu', currency: 'USD', basePrice: 2.5 },
  NATURAL_GAS_GBP: { name: 'UK Natural Gas', unit: 'therm', currency: 'GBP', basePrice: 85 },
  COAL_USD: { name: 'Thermal Coal', unit: 'metric ton', currency: 'USD', basePrice: 130 },
  GOLD_USD: { name: 'Gold', unit: 'troy oz', currency: 'USD', basePrice: 2050 },
  GBP_USD: { name: 'British Pound', unit: 'USD', currency: 'USD', basePrice: 1.27 },
  EUR_USD: { name: 'Euro', unit: 'USD', currency: 'USD', basePrice: 1.09 },
  DUBAI_CRUDE_USD: { name: 'Dubai Crude', unit: 'barrel', currency: 'USD', basePrice: 76 },
  DUTCH_TTF_EUR: { name: 'Dutch TTF Natural Gas', unit: 'MWh', currency: 'EUR', basePrice: 28 },
  MGO_05S_USD: { name: 'Marine Gas Oil 0.5%', unit: 'metric ton', currency: 'USD', basePrice: 750 },
  VLSFO_USD: { name: 'Very Low Sulphur Fuel Oil', unit: 'metric ton', currency: 'USD', basePrice: 580 },
  HFO_380_USD: { name: 'Heavy Fuel Oil 380', unit: 'metric ton', currency: 'USD', basePrice: 420 },
  HFO_180_USD: { name: 'Heavy Fuel Oil 180', unit: 'metric ton', currency: 'USD', basePrice: 450 }
};

// All valid event types
export const EVENT_TYPES = [
  'price.updated',
  'price.significant_change',
  'price.threshold',
  'drilling.rig_count.updated',
  'drilling.frac_spread.updated',
  'drilling.well_permit.new',
  'drilling.well_permit.updated',
  'drilling.well_permits.batch',
  'drilling.duc_well.updated',
  'api.limit.warning',
  'api.limit.exceeded',
  'subscription.updated',
  'subscription.cancelled',
  'analytics_alert.triggered'
];

// Helper to generate random variation
const vary = (base, percent = 5) => {
  const variation = base * (percent / 100);
  return Number((base + (Math.random() * variation * 2) - variation).toFixed(2));
};

// Payload generators for each event type
export const generatePayloads = {
  'price.updated': (commodity = 'WTI_USD') => {
    const info = COMMODITY_INFO[commodity] || COMMODITY_INFO.WTI_USD;
    const prevValue = vary(info.basePrice);
    const currentValue = vary(info.basePrice);
    const changePercent = ((currentValue - prevValue) / prevValue * 100).toFixed(2);

    return {
      id: randomUUID(),
      event: 'price.updated',
      created_at: new Date().toISOString(),
      data: {
        commodity_code: commodity,
        commodity: commodity,
        name: info.name,
        value: currentValue,
        currency: info.currency,
        unit: info.unit,
        source: 'investing.com',
        previous_value: prevValue,
        change_percent: parseFloat(changePercent),
        timestamp: new Date().toISOString()
      }
    };
  },

  'price.significant_change': (commodity = 'WTI_USD') => {
    const info = COMMODITY_INFO[commodity] || COMMODITY_INFO.WTI_USD;
    const prevValue = vary(info.basePrice);
    const changePercent = 5 + Math.random() * 5; // 5-10% change
    const isUp = Math.random() > 0.5;
    const currentValue = Number((prevValue * (1 + (isUp ? changePercent : -changePercent) / 100)).toFixed(2));

    return {
      id: randomUUID(),
      event: 'price.significant_change',
      created_at: new Date().toISOString(),
      data: {
        commodity: commodity,
        commodity_code: commodity,
        name: info.name,
        value: currentValue,
        currency: info.currency,
        unit: info.unit,
        change_percent: isUp ? changePercent.toFixed(2) : (-changePercent).toFixed(2),
        threshold_exceeded: '5%',
        alert_type: isUp ? 'surge' : 'drop',
        previous_value: prevValue,
        timestamp: new Date().toISOString()
      }
    };
  },

  'price.threshold': (commodity = 'WTI_USD') => {
    const info = COMMODITY_INFO[commodity] || COMMODITY_INFO.WTI_USD;
    const threshold = info.basePrice * 1.05;
    const currentValue = threshold + vary(5);

    return {
      id: randomUUID(),
      event: 'price.threshold',
      created_at: new Date().toISOString(),
      data: {
        commodity: commodity,
        commodity_code: commodity,
        name: info.name,
        value: currentValue,
        currency: info.currency,
        previous_value: vary(info.basePrice),
        condition_triggered: {
          operator: 'greater_than',
          threshold: threshold.toFixed(2)
        },
        timestamp: new Date().toISOString()
      }
    };
  },

  'drilling.rig_count.updated': () => ({
    id: randomUUID(),
    event: 'drilling.rig_count.updated',
    created_at: new Date().toISOString(),
    data: {
      region: 'US Total',
      rig_count: Math.floor(580 + Math.random() * 80),
      oil_rigs: Math.floor(450 + Math.random() * 60),
      gas_rigs: Math.floor(100 + Math.random() * 40),
      change_from_prior_week: Math.floor(Math.random() * 10) - 5,
      change_from_prior_year: Math.floor(Math.random() * 100) - 50,
      report_date: new Date().toISOString().split('T')[0],
      source: 'Baker Hughes',
      timestamp: new Date().toISOString()
    }
  }),

  'drilling.frac_spread.updated': () => ({
    id: randomUUID(),
    event: 'drilling.frac_spread.updated',
    created_at: new Date().toISOString(),
    data: {
      region: 'US Total',
      frac_spreads_count: Math.floor(240 + Math.random() * 60),
      change_from_prior_week: Math.floor(Math.random() * 20) - 10,
      report_date: new Date().toISOString().split('T')[0],
      source: 'Primary Vision',
      timestamp: new Date().toISOString()
    }
  }),

  'drilling.well_permit.new': () => {
    const states = ['TX', 'NM', 'ND', 'OK', 'CO', 'WY', 'LA'];
    const state = states[Math.floor(Math.random() * states.length)];
    const apiNum = `${Math.floor(Math.random() * 50)}-${String(Math.floor(Math.random() * 500)).padStart(3, '0')}-${String(Math.floor(Math.random() * 99999)).padStart(5, '0')}`;

    return {
      id: randomUUID(),
      event: 'drilling.well_permit.new',
      created_at: new Date().toISOString(),
      data: {
        api_number: apiNum,
        api_number_raw: apiNum.replace(/-/g, '') + '0000',
        state_code: state,
        county: 'Midland',
        permit_number: `DP-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 99999)).padStart(5, '0')}`,
        permit_type: 'New Drill',
        permit_status: 'Approved',
        permit_date: new Date().toISOString().split('T')[0],
        operator: {
          name: 'Pioneer Natural Resources',
          name_raw: 'PIONEER NATURAL RESOURCES USA INC',
          number: String(Math.floor(Math.random() * 999999))
        },
        well: {
          name: `TEST WELL ${Math.floor(Math.random() * 100)}H`,
          number: `${Math.floor(Math.random() * 10)}H`,
          type: Math.random() > 0.3 ? 'Horizontal' : 'Vertical'
        },
        location: {
          latitude: 31.5 + Math.random() * 1.5,
          longitude: -102 - Math.random() * 2,
          county: 'Midland',
          section: String(Math.floor(Math.random() * 36) + 1),
          township: `${Math.floor(Math.random() * 10) + 1}S`,
          range: `${Math.floor(Math.random() * 40) + 30}E`
        },
        target: {
          formation: 'Wolfcamp A',
          formation_raw: 'WOLFCAMP A SHALE',
          total_depth_proposed: 18000 + Math.floor(Math.random() * 8000)
        },
        provenance: {
          source: state === 'TX' ? 'Texas RRC' : 'State Oil & Gas Commission',
          source_url: 'https://rrc.texas.gov/oil-gas/',
          fetched_at: new Date().toISOString(),
          data_as_of: new Date().toISOString().split('T')[0]
        }
      }
    };
  },

  'drilling.well_permit.updated': () => {
    const apiNum = `42-${String(Math.floor(Math.random() * 500)).padStart(3, '0')}-${String(Math.floor(Math.random() * 99999)).padStart(5, '0')}`;
    const statuses = ['Approved', 'Drilling', 'Completed', 'Plugged'];
    const fromIdx = Math.floor(Math.random() * 3);

    return {
      id: randomUUID(),
      event: 'drilling.well_permit.updated',
      created_at: new Date().toISOString(),
      data: {
        api_number: apiNum,
        state_code: 'TX',
        permit_status: statuses[fromIdx + 1],
        status_change: {
          from: statuses[fromIdx],
          to: statuses[fromIdx + 1]
        },
        timestamp: new Date().toISOString()
      }
    };
  },

  'drilling.well_permits.batch': () => {
    const permits = [];
    const count = 3 + Math.floor(Math.random() * 5);
    for (let i = 0; i < count; i++) {
      permits.push(generatePayloads['drilling.well_permit.new']().data);
    }

    return {
      id: randomUUID(),
      event: 'drilling.well_permits.batch',
      created_at: new Date().toISOString(),
      data: {
        state: 'TX',
        batch_id: randomUUID(),
        pagination: {
          page: 1,
          total_pages: 1,
          per_page: 100,
          total_count: count,
          has_next: false
        },
        permits: permits,
        batch_timestamp: new Date().toISOString()
      }
    };
  },

  'drilling.duc_well.updated': () => {
    const regions = ['Permian', 'Eagle Ford', 'Bakken', 'Niobrara', 'Appalachia'];
    const region = regions[Math.floor(Math.random() * regions.length)];

    return {
      id: randomUUID(),
      event: 'drilling.duc_well.updated',
      created_at: new Date().toISOString(),
      data: {
        region: region,
        duc_count: 4000 + Math.floor(Math.random() * 1000),
        change_from_prior_month: Math.floor(Math.random() * 200) - 100,
        completions_this_month: 300 + Math.floor(Math.random() * 200),
        report_date: new Date().toISOString().split('T')[0],
        source: 'EIA',
        timestamp: new Date().toISOString()
      }
    };
  },

  'api.limit.warning': () => ({
    id: randomUUID(),
    event: 'api.limit.warning',
    created_at: new Date().toISOString(),
    data: {
      resource: 'api_requests',
      usage: 8000 + Math.floor(Math.random() * 1500),
      limit: 10000,
      percentage: 80 + Math.floor(Math.random() * 15),
      period: 'monthly'
    }
  }),

  'api.limit.exceeded': () => ({
    id: randomUUID(),
    event: 'api.limit.exceeded',
    created_at: new Date().toISOString(),
    data: {
      resource: 'api_requests',
      usage: 10000 + Math.floor(Math.random() * 500),
      limit: 10000,
      percentage: 100 + Math.floor(Math.random() * 10),
      period: 'monthly',
      exceeded_at: new Date().toISOString()
    }
  }),

  'subscription.updated': () => {
    const plans = ['Pipeline', 'Refinery', 'Reservoir Mastery'];
    const statuses = ['active', 'trialing', 'past_due'];

    return {
      id: randomUUID(),
      event: 'subscription.updated',
      created_at: new Date().toISOString(),
      data: {
        subscription_id: `sub_${randomUUID().slice(0, 12)}`,
        plan_name: plans[Math.floor(Math.random() * plans.length)],
        status: statuses[Math.floor(Math.random() * statuses.length)],
        current_period_start: new Date().toISOString(),
        current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date().toISOString()
      }
    };
  },

  'subscription.cancelled': () => ({
    id: randomUUID(),
    event: 'subscription.cancelled',
    created_at: new Date().toISOString(),
    data: {
      subscription_id: `sub_${randomUUID().slice(0, 12)}`,
      plan_name: 'Reservoir Mastery',
      cancelled_at: new Date().toISOString(),
      effective_end_date: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString()
    }
  }),

  'analytics_alert.triggered': () => {
    const alertTypes = ['z_score', 'rsi', 'trend_reversal', 'volatility_spike', 'correlation_breakdown'];
    const alertType = alertTypes[Math.floor(Math.random() * alertTypes.length)];

    return {
      id: randomUUID(),
      event: 'analytics_alert.triggered',
      created_at: new Date().toISOString(),
      data: {
        alert_id: randomUUID(),
        alert_name: `${alertType.replace(/_/g, ' ').toUpperCase()} Alert`,
        commodity_code: COMMODITIES[Math.floor(Math.random() * COMMODITIES.length)],
        analytics_type: alertType,
        analytics_period: 30,
        condition: `Threshold exceeded`,
        current_value: vary(2.5, 50),
        threshold: 2.0,
        trigger_count: Math.floor(Math.random() * 5) + 1,
        metadata: {},
        details: {
          trend: ['up', 'down', 'sideways'][Math.floor(Math.random() * 3)],
          current_rsi: vary(50, 40),
          z_score: vary(2, 50),
          correlation: vary(0.8, 20)
        },
        triggered_at: new Date().toISOString()
      }
    };
  }
};
