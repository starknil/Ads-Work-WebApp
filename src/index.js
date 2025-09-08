require('dotenv').config();
const { BOT_TOKEN, ADMIN } = process.env;

const bot = require('../bot/bot.js');
const {
  connectDB,
  CREATE_USER,
  FETCH_MERGE_PROFILE,
  GET_USER,
  UPDATE_USER,
  ADD_ADS_WATCHED,
  ADD_TASK,
  GET_TASK,
  UPDATE_TASK,
  ADD_WITHDRAWAL,
} = require('../database/db.js');
const usingVpn = require('./vpn.js');
const express = require('express');
const crypto = require('crypto');
const axios = require('axios');
const adminRoute = require('../src/admin-route.js');
const fs = require('fs');
const fetch = require('node-fetch');
const path = require('path');

const app = express();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../public/admin/views'));
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));
app.set('trust proxy', true);

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});

app.use('/admin', adminRoute);

app.post('/adsgram-reward', async (req, res) => {
  console.log(req.query);
  console.log(req.body);
});

app.use((req, res, next) => {
  const tg = req.body?.tg;
  if (!tg) {
    return res.status(400).send('Invalid request: No valid tg datas in request body!');
  }

  const { initData, initDataUnsafe } = tg;

  if (!initData || !initDataUnsafe) {
    console.error('No initData found in request body');
    return res.status(400).send('Invalid request: No initData found in request body!');
  }

  const urlParams = new URLSearchParams(initData);
  const hash = urlParams.get('hash');

  const dataCheckArr = [];
  urlParams.sort();
  for (const [key, value] of urlParams) {
    if (key !== 'hash') {
      dataCheckArr.push(`${key}=${value}`);
    }
  }

  const dataCheckString = dataCheckArr.join('\n');

  const secretKey = crypto.createHmac('sha256', 'WebAppData').update(BOT_TOKEN).digest();

  const hmac = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

  if (hmac !== hash) {
    console.error('Invalid hash in initData');
    return res.status(400).send('Invalid request: Invalid hash in initData!');
  }
  console.log('Hash verified successfully');
  req.body.userId = initDataUnsafe.user.id;
  if (tg.ip) {
    req.body.ip = tg.ip;
  }
  next();
});

app.post('/register', async (req, res) => {
  const { userId } = req.body;
  const ip = req.ip;

  try {
    if (!ip || !userId) {
      throw new Error('Missing valid parameters!');
    }

    let vpn = await usingVpn(ip);
    if (vpn.vpn === true) {
      console.log('User is using VPN! ', ipDetails);
      throw new Error(`Sorry you got into ${vpn.region} ${vpn.country} with VPN. Turn if OFF!`);
    }

    const ipAlready = await GET_USER(ip, 'ip');

    if (ipAlready) {
      throw new Error('Duplicate account detected. Sorry, multiple accounts are not allow!');
    }

    const user = await GET_USER(userId);

    if (user) {
      throw new Error('An account found for user, please refresh the page!');
    }

    let channels = ['AdWorksyNews', 'Airdrops_Galaxy', 'CryptoAirdropRush'];
    channels = ['codingdemos'];
    const joinedAll = await Promise.all(
      channels.map((c) => {
        return bot.telegram.getChatMember(`@${c}`, userId);
      }),
    );

    const inAll = joinedAll.every((m) => ['member', 'creator', 'administrator'].includes(m.status));

    if (!inAll) {
      throw new Error('You must join all the channels');
    }

    const ref = req.body.tg.ref;
    const upline = !isNaN(ref) && ref > 8 ? ref : null;

    const { first_name, last_name, username, photo_url } = req.body.tg.initDataUnsafe.user;
    const name = `${first_name || ''} ${last_name || ''}`.trim();

    uu = {
      user: userId,
      name,
      username: username || 'No username',
      photoUrl: photo_url,
      balance: 0,
      withdrawn: 0,
      upline,
      uplineDirectBonus: false,
      referredUsers: [],
      refererEarnings: 0,
      streak: 0,
      bonuses: 0,
      lastCheckin: null,
      tgTasksDone: 0,
      ip,
      country: vpn.country,
      lastDirectLinkVisit: null,
      createdAt: new Date(),
    };

    const created = await CREATE_USER(uu);

    if (!created) {
      console.log('Error creating user. Please try again later.');
      throw new Error('Error creating account, please try again later!');
    }

    res.status(200).json({ ok: true });

    if (!upline) return;

    const bott = await GET_USER('bot');
    if (!bott) {
      throw new Error("Couldn't fetch bot's configuraton!");
    }

    const { referralEarnings } = bott;

    try {
      await UPDATE_USER(Number(upline), {
        $push: {
          referredUsers: {
            user: userId,
            name,
            username: username || 'No username',
            photoUrl: photo_url || null,
            reward: referralEarnings,
            joinedAt: new Date(),
          },
        },
      });

      bot.telegram.sendMessage(
        upline,
        '<b>🎉 Congratulations</b>, new user joined the bot through your refer link. Enjoy <b>' +
          referralEarnings +
          "%</b> on all user's tasks!",
        {
          parse_mode: 'HTML',
        },
      );
    } catch (e) {
      console.error('Error updating upline:', e); // Ignore
    }
  } catch (e) {
    console.log('Registration details uncompleted! ', e.message);
    res.status(e.message ? 200 : 500).json({ message: e.message || 'Internal server error!' });
  }
});

app.post('/bot-settings', async (req, res) => {
  try {
    const botSettings = await GET_USER('bot');
    if (!botSettings) {
      console.error('No bot settings found in the database');
      return res.status(404).send('Bot settings not found');
    }

    delete botSettings._id;
    delete botSettings.user;
    delete botSettings.createdAt;
    delete botSettings.isActive;
    delete botSettings.password;

    res.json(botSettings);
  } catch (error) {
    console.error('Error fetching bot settings:', error);
    res.status(500).send('Error fetching bot settings');
  }
});

app.post('/user-settings', async (req, res) => {
  try {
    let vpn = await usingVpn(req.ip);
    if (vpn.vpn === true) {
      console.log('User is using VPN! ', vpn);
      throw new Error(`Sorry you got into ${vpn.region} ${vpn.country} with VPN. Turn if OFF!`);
    }

    let user = await FETCH_MERGE_PROFILE(req.body.tg.initDataUnsafe.user.id);
    if (user.length === 0) {
      console.error('User not found in the database! ' + req.body.userId);
      return res.json({
        new: true,
      });
    }

    const userSettings = user[0];
    delete userSettings._id;
    delete userSettings.upline;
    delete userSettings.user;

    console.log('User settings fetched successfully:');
    res.json(userSettings);
  } catch (error) {
    console.error('Error fetching bot settings:', error.message || error);
    res.status(500).send(error.message || 'Error fetching bot settings');
  }
});

app.post('/claim-checkin', async (req, res) => {
  try {
    const { userId } = req.body;
    const user = await GET_USER(userId);
    if (!user) {
      throw new Error('User not found!');
    }

    let { lastCheckin, streak } = user;

    const today = new Date().setHours(0, 0, 0, 0);

    const lastChecked = lastCheckin ? new Date(lastCheckin).setHours(0, 0, 0, 0) : null;
    const canClaim = !lastCheckin || lastChecked < today;

    if (!canClaim) {
      throw new Error('Suspicious claiming attempt!');
    }

    const bott = await GET_USER('bot');
    if (!bott) {
      throw new Error("Couldn't fetch bot's settings!");
    }

    const { currency, daysEarning } = bott;

    if (!lastChecked) {
      streak = 1;
    } else if (lastChecked === today - 24 * 60 * 60 * 1000) {
      streak += 1;
    } else if (lastChecked < today - 24 * 60 * 60 * 1000) {
      streak = 1;
    }

    const reward = daysEarning[streak - 1] || daysEarning[0];

    console.log(`Claiming checkin bonus of ${reward} ${currency} for user ${userId}`);

    await UPDATE_USER(userId, {
      $inc: {
        balance: Number(reward),
        bonuses: Number(reward),
      },
      $set: {
        streak: streak,
        lastCheckin: today,
      },
    });

    console.log('claimed');

    bot.telegram.sendMessage(
      userId,
      "<b>🎉 Awesome!</b> You've earned " +
        reward +
        ' ' +
        currency +
        ' for checking in on Day ' +
        streak +
        '!',
      {
        parse_mode: 'HTML',
      },
    );

    return res.status(200).json({
      reward,
      lastCheckin: today,
      text: `🎉 You earned ${reward} ${currency}!`,
    });
  } catch (e) {
    console.log('Error claiming checking for user ', e);
    return res.status(500).send(e.message || 'Internal server error');
  }
});

app.post('/ads-reward', async (req, res) => {
  const { provider, userId } = req.body;

  if (!provider) {
    throw new Error('No ads watch. Be caution!');
  }

  try {
    const pro = await FETCH_MERGE_PROFILE(userId);

    if (pro.length === 0) {
      throw new Error('User data not found!');
    }

    const bott = await GET_USER('bot');

    if (!bott) {
      throw new Error("Failed to get app's configuration!");
    }

    const { currency, dailyTaskLimit, hourlyTaskLimit, adsReward, referralDirectBonus } = bott;

    const { adsTaskStats, upline, uplineDirectBonus } = pro[0];

    const { lastHour, today, totalEarned, totalCount } = adsTaskStats;

    if (today >= dailyTaskLimit) {
      throw new Error('Daily Limit Reached!');
    }

    if (lastHour >= hourlyTaskLimit) {
      throw new Error('Hourly Limit Reached!');
    }

    await ADD_ADS_WATCHED({
      user: userId,
      provider,
      reward: adsReward,
      watchedAt: new Date(),
    });

    await UPDATE_USER(userId, {
      $inc: {
        balance: adsReward,
        bonuses: adsReward,
      },
    });

    res.status(200).json({
      status: true,
      reward: adsReward,
      message: `🎉 You earned ${adsReward} ${currency} for viewing the ad!`,
    });

    if (totalCount === 5 && upline && !uplineDirectBonus) {
      await UPDATE_USER(userId, {
        $set: {
          uplineDirectBonus: true,
        },
      });

      await UPDATE_USER(upline, {
        $inc: {
          balance: referralDirectBonus,
          refererEarnings: referralDirectBonus,
        },
      });

      bot.telegram.sendMessage(
        upline,
        "<b>🎉 Congratulations!</b> You've earned " +
          referralDirectBonus +
          ' ' +
          currency +
          ' from a refer upon completing his/her first 5 tasks!',
        {
          parse_mode: 'HTML',
        },
      );
    }
  } catch (e) {
    console.log('Error in ads-reward ', e);
    return res.status(500).send(e.message || 'Internal Server Error!');
  }
});

app.post('/verify-task', async (req, res) => {
  const { taskId } = req.body;
  const { userId } = req.body;

  if (!taskId) {
    console.log('Invalid task id!');
    return res.status(400).send('Invalid task id!');
  }

  try {
    const task = await GET_TASK(Number(taskId));

    if (!task) {
      return res.status(200).json({
        status: false,
        txt: 'Task not found!',
      });
    }

    console.log(task);

    if (task.performedBy.includes(userId)) {
      return res.status(200).json({
        status: false,
        txt: 'Task already completed by you!',
      });
    }

    if (task.type === 'tg') {
      let found;

      try {
        found = await bot.telegram.getChatMember(`@${task.username}`, userId);
      } catch (e) {
        console.log('Error fetching user status in channel ', e);
        found = false;
      }

      if (
        !found ||
        (found.status !== 'member' &&
          found.status !== 'creator' &&
          found.status !== 'administrator')
      ) {
        return res.status(200).json({
          status: false,
          txt: 'You must join the channel to get reward!',
        });
      }
    }

    await UPDATE_TASK(Number(taskId), {
      $push: { performedBy: userId },
    });

    await UPDATE_USER(userId, {
      $inc: { balance: task.reward, tgTasksDone: 1, bonuses: task.reward },
    });

    return res.status(200).json({
      status: true,
      reward: task.reward,
    });
  } catch (e) {
    console.log('Error verifying task ', e);
    res.status(500).send();
  }
});

app.post('/link-reward', async (req, res) => {
  try {
    const { userId } = req.body;
    const user = await GET_USER(userId);
    if (!user) {
      throw new Error('User not found!');
    }

    const bott = await GET_USER('bot');

    if (!bott) {
      throw new Error("Couldn't fetch bot's settings!");
    }

    const { currency, directLinkCooldown } = bott;

    const reward = 10;

    const lastDirectLinkVisit = user.lastDirectLinkVisit
      ? Math.floor((new Date() - new Date(user.lastDirectLinkVisit)) / 1000)
      : null;

    console.log('Last direct link visit:', lastDirectLinkVisit);

    if (!lastDirectLinkVisit || lastDirectLinkVisit > directLinkCooldown) {
      console.log(`Claiming reward for link visit!`);

      await UPDATE_USER(userId, {
        $inc: {
          balance: Number(reward),
          bonuses: Number(reward),
        },
        $set: {
          lastDirectLinkVisit: new Date(),
        },
      });

      console.log('Rewarded');

      return res.status(200).json({
        reward,
        text: `🎉 You earned ${reward} ${currency} for visiting link!`,
      });
    }
    throw new Error(
      `You can visit next link after ${directLinkCooldown - lastDirectLinkVisit} seconds!`,
    );
  } catch (e) {
    console.log('Error rewarding user for link visit ', e);
    return res.status(500).send(e.message || 'Internal server error');
  }
});

app.post('/request-withdraw', async (req, res) => {
  try {
    const { userId, amount, address } = req.body;
    const user = await GET_USER(userId);
    if (!user) {
      throw new Error('User not found!');
    }
    if (!amount || isNaN(amount) || amount <= 0) {
      throw new Error('Invalid amount!');
    }
    if (!address || address.length < 30) {
      throw new Error('Invalid address!');
    }
    if (amount > user.balance) {
      throw new Error('Insufficient balance!');
    }
    const bott = await GET_USER('bot');
    if (!bott) {
      throw new Error("Couldn't fetch bot's settings!");
    }
    if (amount < bott.minWithdraw) {
      throw new Error(`Minimum withdraw amount is ${bott.minWithdraw} ${bott.currency}`);
    }

    await UPDATE_USER(userId, {
      $inc: { balance: -Number(amount), withdrawn: Number(amount) },
    });

    const withdrawId = crypto.randomBytes(10).toString('hex').toUpperCase();

    await ADD_WITHDRAWAL({
      status: 'pending',
      withdrawId,
      user: userId,
      name: user.name,
      username: user.username,
      photoUrl: user.photoUrl,
      amount: Number(amount),
      address,
      createdAt: new Date(),
      completed: false,
    });

    console.log(
      `User ${userId} requested withdraw of ${amount} ${bott.currency} to address ${address}`,
    );

    await bot.telegram.sendMessage(
      userId,
      `💸 Your withdrawal request of <b>${amount} ${bott.currency}</b> to address:\n\n<i>${address}</i>\n\nis being processed. Your withdrawal ID is <b>${withdrawId}</b>. Please keep this ID for your records.`,
      {
        parse_mode: 'HTML',
      },
    );
    /*
    await bot.telegram.sendMessage(
      ADMIN,
      `<b>💸 New withdrawal request:</b>\n\n<b>User:</b> ${userId}\nAmount: <b>${amount} ${bott.currency}\nAddress:</b> ${address}\n<b>Withdraw ID:</b> ${withdrawId}`,
      {
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "✅ Mark as paid",
                callback_data: "/markwith_completed_" + withdrawId,
              },
            ],
            [
              {
                text: "⛔️ Mark as failed",
                callback_data: "/markwith_failed_" + withdrawId,
              },
            ],
          ],
        },
      }
    );
*/
    return res.status(200).json({
      status: true,
      message: `Withdrawal request for ${amount} ${bott.currency} to ${address} has been submitted.`,
    });
  } catch (e) {
    console.log('Error requesting withdraw ', e);
    return res.status(500).json({
      message: e.message || 'Internal server error',
    });
  }
});

(async () => {
  try {
    await connectDB();
    bot.launch().catch((err) => {
      console.error('Failed to launch bot:', err);
    });
    console.log('Bot is running...');
    app.listen(process.env.PORT || 5000, () => {
      console.log(`Server is running on port http://localhost:${process.env.PORT || 5000}`);
    });
  } catch (e) {
    console.log(e);
  }
})();
