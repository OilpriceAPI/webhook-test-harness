#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import axios from 'axios';
import crypto from 'crypto';
import { generatePayloads, EVENT_TYPES, COMMODITIES } from './samplePayloads.js';

const program = new Command();

program
  .name('opa-webhook')
  .description('OilPriceAPI Webhook Test Harness CLI')
  .version('1.0.0');

// ============================================================
// TRIGGER - Send test webhooks to local harness
// ============================================================
program
  .command('trigger')
  .description('Send test webhook(s) to the local harness')
  .option('-e, --event <type>', 'Event type (default: price.updated)', 'price.updated')
  .option('-c, --commodity <code>', 'Commodity code for price events', 'WTI_USD')
  .option('-t, --target <url>', 'Target webhook URL', 'http://localhost:3333/webhook')
  .option('-s, --secret <secret>', 'Webhook secret for signing')
  .option('--all', 'Send all 14 event types')
  .option('--all-commodities', 'Send price.updated for all 14 commodities')
  .option('--delay <ms>', 'Delay between webhooks in ms', '100')
  .action(async (options) => {
    const spinner = ora('Preparing webhooks...').start();

    try {
      let eventsToSend = [];

      if (options.all) {
        // Send all event types
        for (const eventType of EVENT_TYPES) {
          eventsToSend.push({ eventType, commodity: 'WTI_USD' });
        }
      } else if (options.allCommodities) {
        // Send price.updated for all commodities
        for (const commodity of COMMODITIES) {
          eventsToSend.push({ eventType: 'price.updated', commodity });
        }
      } else {
        // Single event
        eventsToSend.push({ eventType: options.event, commodity: options.commodity });
      }

      spinner.text = `Sending ${eventsToSend.length} webhook(s)...`;
      let sent = 0;
      let failed = 0;

      for (const { eventType, commodity } of eventsToSend) {
        try {
          const generator = generatePayloads[eventType];
          if (!generator) {
            console.log(chalk.yellow(`  Unknown event type: ${eventType}`));
            failed++;
            continue;
          }

          const payload = generator(commodity);
          const payloadJson = JSON.stringify(payload);
          const timestamp = Math.floor(Date.now() / 1000).toString();

          const headers = {
            'Content-Type': 'application/json',
            'User-Agent': 'OilPriceAPI-Webhooks/1.0',
            'X-OilPriceAPI-Event': eventType,
            'X-OilPriceAPI-Event-ID': payload.id
          };

          // Sign if secret provided
          if (options.secret) {
            const signaturePayload = `${payloadJson}.${timestamp}`;
            const signature = crypto
              .createHmac('sha256', options.secret)
              .update(signaturePayload)
              .digest('hex');

            headers['X-OilPriceAPI-Signature'] = signature;
            headers['X-OilPriceAPI-Signature-Timestamp'] = timestamp;
          }

          await axios.post(options.target, payload, { headers });

          const commodityInfo = eventType.startsWith('price.') ? chalk.gray(` (${commodity})`) : '';
          spinner.succeed(chalk.green(`Sent: ${eventType}${commodityInfo}`));
          sent++;

          // Delay between sends
          if (eventsToSend.length > 1 && parseInt(options.delay) > 0) {
            await new Promise(r => setTimeout(r, parseInt(options.delay)));
          }

          if (sent < eventsToSend.length) {
            spinner.start(`Sending ${eventsToSend.length - sent} more...`);
          }
        } catch (err) {
          spinner.fail(chalk.red(`Failed: ${eventType} - ${err.message}`));
          failed++;
          spinner.start(`Continuing...`);
        }
      }

      spinner.stop();
      console.log('');
      console.log(chalk.bold(`Summary: ${chalk.green(sent + ' sent')}, ${chalk.red(failed + ' failed')}`));
      console.log(chalk.gray(`Dashboard: http://localhost:3333`));

    } catch (error) {
      spinner.fail(chalk.red(`Error: ${error.message}`));
    }
  });

// ============================================================
// TRIGGER-PRODUCTION - Trigger via OPA API test endpoint
// ============================================================
program
  .command('trigger-production')
  .description('Trigger a test webhook via OilPriceAPI production API')
  .requiredOption('-k, --api-key <key>', 'OilPriceAPI API key')
  .requiredOption('-w, --webhook-id <id>', 'Webhook endpoint ID')
  .option('--api-url <url>', 'API base URL', 'https://api.oilpriceapi.com')
  .action(async (options) => {
    const spinner = ora('Triggering webhook via OPA API...').start();

    try {
      const response = await axios.post(
        `${options.apiUrl}/v1/webhooks/${options.webhookId}/test`,
        {},
        {
          headers: {
            'Authorization': `Token ${options.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      spinner.succeed(chalk.green('Webhook triggered via production API!'));
      console.log(chalk.gray('Response:'), JSON.stringify(response.data, null, 2));

    } catch (error) {
      const msg = error.response?.data?.error || error.response?.data?.message || error.message;
      spinner.fail(chalk.red(`Failed: ${msg}`));
    }
  });

// ============================================================
// LIST - List captured webhooks
// ============================================================
program
  .command('list')
  .description('List captured webhooks from local harness')
  .option('-l, --limit <number>', 'Number of events to show', '20')
  .option('-e, --event <type>', 'Filter by event type')
  .option('-c, --commodity <code>', 'Filter by commodity')
  .option('-t, --target <url>', 'Harness API URL', 'http://localhost:3333')
  .action(async (options) => {
    try {
      const params = new URLSearchParams({
        limit: options.limit,
        ...(options.event && { eventType: options.event }),
        ...(options.commodity && { commodity: options.commodity })
      });

      const response = await axios.get(`${options.target}/api/events?${params}`);
      const { events, total } = response.data;

      console.log(chalk.bold(`\nCaptured Webhooks (${events.length} of ${total}):\n`));

      if (events.length === 0) {
        console.log(chalk.gray('  No webhooks captured yet.'));
        console.log(chalk.gray('  Use "opa-webhook trigger" to send test webhooks.'));
        return;
      }

      events.forEach((event, i) => {
        const sigStatus = event.signature_valid
          ? chalk.green('valid')
          : chalk.red(event.signature_error || 'invalid');

        const commodity = event.commodity ? chalk.yellow(` [${event.commodity}]`) : '';

        console.log(
          chalk.gray(`${String(i + 1).padStart(2)}.`) +
          chalk.cyan(` ${event.event_type.padEnd(30)}`) +
          commodity +
          chalk.gray(` | Sig: `) + sigStatus +
          chalk.gray(` | ${new Date(event.received_at).toLocaleString()}`)
        );
      });

      console.log('');

    } catch (error) {
      if (error.code === 'ECONNREFUSED') {
        console.error(chalk.red('Cannot connect to harness. Is it running?'));
        console.error(chalk.gray('Start with: npm start'));
      } else {
        console.error(chalk.red(`Error: ${error.message}`));
      }
    }
  });

// ============================================================
// VERIFY - Verify a webhook signature manually
// ============================================================
program
  .command('verify')
  .description('Verify a webhook signature manually')
  .requiredOption('-p, --payload <json>', 'JSON payload (or @filename)')
  .requiredOption('-s, --signature <sig>', 'Signature to verify')
  .requiredOption('-t, --timestamp <ts>', 'Signature timestamp')
  .requiredOption('--secret <secret>', 'Webhook secret')
  .action((options) => {
    let payload = options.payload;

    // Support @filename syntax
    if (payload.startsWith('@')) {
      const fs = require('fs');
      payload = fs.readFileSync(payload.slice(1), 'utf8');
    }

    const signaturePayload = `${payload}.${options.timestamp}`;
    const expectedSignature = crypto
      .createHmac('sha256', options.secret)
      .update(signaturePayload)
      .digest('hex');

    let isValid = false;
    try {
      isValid = crypto.timingSafeEqual(
        Buffer.from(options.signature, 'hex'),
        Buffer.from(expectedSignature, 'hex')
      );
    } catch (e) {
      console.log(chalk.red.bold('Invalid signature format'));
      return;
    }

    if (isValid) {
      console.log(chalk.green.bold('\nSignature is VALID'));
    } else {
      console.log(chalk.red.bold('\nSignature is INVALID'));
      console.log(chalk.gray('Expected:'), expectedSignature);
      console.log(chalk.gray('Provided:'), options.signature);
    }

    // Check timestamp age
    const age = Math.abs(Date.now() / 1000 - parseInt(options.timestamp));
    if (age > 300) {
      console.log(chalk.yellow(`\nWarning: Timestamp is ${Math.floor(age)}s old (>5min tolerance)`));
    } else {
      console.log(chalk.gray(`\nTimestamp age: ${Math.floor(age)}s (within 5min tolerance)`));
    }
  });

// ============================================================
// STATS - Show capture statistics
// ============================================================
program
  .command('stats')
  .description('Show webhook capture statistics')
  .option('-t, --target <url>', 'Harness API URL', 'http://localhost:3333')
  .action(async (options) => {
    try {
      const response = await axios.get(`${options.target}/api/stats`);
      const { stats } = response.data;

      console.log(chalk.bold('\nWebhook Capture Statistics:\n'));

      if (stats.length === 0) {
        console.log(chalk.gray('  No webhooks captured yet.'));
        return;
      }

      console.log(chalk.gray('  Event Type'.padEnd(35) + 'Count'.padStart(8) + 'Valid Sigs'.padStart(14) + 'Last Received'));
      console.log(chalk.gray('  ' + '-'.repeat(75)));

      stats.forEach(stat => {
        const validPercent = stat.count > 0
          ? Math.round(stat.valid_signatures / stat.count * 100)
          : 0;
        const validStr = `${stat.valid_signatures}/${stat.count} (${validPercent}%)`;
        const lastReceived = new Date(stat.last_received).toLocaleString();

        console.log(
          '  ' +
          chalk.cyan(stat.event_type.padEnd(33)) +
          String(stat.count).padStart(8) +
          (validPercent >= 80 ? chalk.green : chalk.red)(validStr.padStart(14)) +
          chalk.gray('  ' + lastReceived)
        );
      });

      console.log('');

    } catch (error) {
      if (error.code === 'ECONNREFUSED') {
        console.error(chalk.red('Cannot connect to harness. Is it running?'));
      } else {
        console.error(chalk.red(`Error: ${error.message}`));
      }
    }
  });

// ============================================================
// CLEAR - Clear all captured webhooks
// ============================================================
program
  .command('clear')
  .description('Clear all captured webhooks')
  .option('-t, --target <url>', 'Harness API URL', 'http://localhost:3333')
  .option('-y, --yes', 'Skip confirmation')
  .action(async (options) => {
    if (!options.yes) {
      const readline = await import('readline');
      const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
      const answer = await new Promise(resolve => {
        rl.question(chalk.yellow('Clear all captured webhooks? (y/N) '), resolve);
      });
      rl.close();

      if (answer.toLowerCase() !== 'y') {
        console.log(chalk.gray('Cancelled.'));
        return;
      }
    }

    try {
      await axios.delete(`${options.target}/api/events`);
      console.log(chalk.green('All captured webhooks cleared.'));
    } catch (error) {
      console.error(chalk.red(`Error: ${error.message}`));
    }
  });

// ============================================================
// EVENTS - List all available event types
// ============================================================
program
  .command('events')
  .description('List all valid event types')
  .action(() => {
    console.log(chalk.bold('\nValid OPA Webhook Event Types:\n'));

    const categories = {
      'Price Events': EVENT_TYPES.filter(e => e.startsWith('price.')),
      'Drilling Events': EVENT_TYPES.filter(e => e.startsWith('drilling.')),
      'API Events': EVENT_TYPES.filter(e => e.startsWith('api.')),
      'Subscription Events': EVENT_TYPES.filter(e => e.startsWith('subscription.')),
      'Analytics Events': EVENT_TYPES.filter(e => e.startsWith('analytics'))
    };

    for (const [category, events] of Object.entries(categories)) {
      console.log(chalk.yellow(`  ${category}:`));
      events.forEach(e => console.log(chalk.cyan(`    - ${e}`)));
    }

    console.log('');
  });

// ============================================================
// COMMODITIES - List all available commodities
// ============================================================
program
  .command('commodities')
  .description('List all valid commodity codes')
  .action(() => {
    console.log(chalk.bold('\nValid OPA Commodity Codes:\n'));

    COMMODITIES.forEach(c => console.log(chalk.cyan(`  - ${c}`)));

    console.log('');
  });

program.parse();
