require("dotenv").config();
const { BOT_TOKEN, BASE_URI } = process.env;
const { Telegraf } = require("telegraf");
const bot = new Telegraf(process.env.BOT_TOKEN);

const {
  CREATE_USER,
  GET_USER,
  UPDATE_USER,
  GET_WITHDRAWAL,
  UPDATE_WITHDRAWAL,
} = require("../database/db");

const formatNumber = (num) => {
  return num.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

bot.start(async (ctx) => {
  const userId = ctx.from.id;

  if (ctx.chat.type !== "private") {
    return ctx.reply("This command can only be used in private chats.");
  }

  const botSettings = await GET_USER("bot");

  if (!botSettings || !botSettings.isActive) {
    return ctx.reply("The bot is currently inactive. Please try again later.");
  }
  const { currency, referralEarnings, referralDirectBonus } = botSettings;

  const reply_markup = {
        inline_keyboard: [
          [
            {
              text: "Open Rewards App 🎮",
              web_app: {
                url: BASE_URI,
              },
            },
          ],
          [{ text: "Join Channel 🔔", url: "https://t.me/AdWorksyNews" }],
        ],
      }

  let user = await GET_USER(userId);

  if (!user) {
    return ctx.reply("Please click to set up your account!", {
      reply_markup
    });
  }


  const { balance, tgTasksDone: lifetimeTasks, refererEarnings, bonuses } = user;

  const photoSource = "ads-work-image.png";
  const message = `
<b>Hello, ${ctx.from.first_name || ""} ${ctx.from.last_name || ""}!👋🏻</b>

<u>Welcome to 💰AdWorksyBot</u>!
🚀 Here's your current status:
💰 <b>Balance</b>: ${formatNumber(balance)} ${currency}
📊 <b>Total Earnings:</b> ${formatNumber(bonuses)} ${currency}
✅ <b>Lifetime Tasks</b>: ${lifetimeTasks}
🤝 <b>Referral Earnings</b>: ${formatNumber(refererEarnings)} ${currency}

Ready to earn more? Click below to open the app and start completing tasks or invite friends to earn <u>${referralEarnings}%</u> of their rewards and <u>${referralDirectBonus} ${currency}</u> immediately when your refer complete their first 5 tasks!
`;

  ctx.replyWithPhoto(
    {
      source: photoSource
    },
    {
      caption: message,
      parse_mode: "HTML",
      reply_markup
    }
  );
});

bot.action(/\/markwith_(.+)_(.+)/, async (ctx) => {
  const action = ctx.match[1];
  const id = ctx.match[2];

  ctx.answerCbQuery("Performing action!");

  const withT = await GET_WITHDRAWAL(id);

  console.log(withT);

  if (!withT) {
    return ctx.reply("⛔️ Withdrawal with ID: " + id + " not found!");
  }

  const { status, amount, user, address, withdrawId, completed } = withT;

  if (status !== "pending") {
    return ctx.replyWithHTML(
      "⛔️ Withdraw ID: <b>" +
        id +
        "</b> status is not pending. STATUS: " +
        withT.status
    );
  }

  await UPDATE_WITHDRAWAL(id, {
    $set: {
      status: action,
      completed: true,
    },
  });

  ctx.reply("✅ Withdrawal status has been successfully set to: <b>"+action+"</b>", {
    parse_mode: "HTML"
  });

  if (!completed) {
    await ctx.telegram.sendMessage(
      user,
      `✍️ Status of your withdrawal ID: <b>${withdrawId}</b> of ${amount} to <b>address:</b> ${address} has <b>${action}</b>`, {
        parse_mode: "HTML"
      });
    if (action !== "completed") {
      await UPDATE_USER(user, {
        $inc: {
          balance: amount,
          withdrawn: -amount
        },
      });
      ctx.replyWithHTML("<i>😰 You have been refunded!</i>");
    }
  }
});

module.exports = bot;