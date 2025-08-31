require("dotenv").config();

const { MongoClient } = require("mongodb");
const { MONGO_URI, DB_NAME } = process.env;
const client = new MongoClient(MONGO_URI);
let db, users, adsTaskHistory, withdraws, tgTasks;

const connectDB = async () => {
  try {
    await client.connect();
    db = client.db(DB_NAME);
    users = db.collection("all-users");
    adsTaskHistory = db.collection("ads-task-history");
    withdraws = db.collection("withdrawals");
    tgTasks = db.collection("available-telegram-tasks");
    console.log("Database connected!");

    if (!(await users.findOne({ user: "bot" }))) {
      await users.insertOne({
        user: "bot",
        isActive: true,
        currency: "SHIB",
        referralEarnings: 15,
        referralDirectBonus: 500,
        daysEarning: "150,20,25,100,1000,5000,10000,20000".split(","),
        adsReward: 5,
        dailyTaskLimit: 240,
        hourlyTaskLimit: 10,
        minimumWithdrawal: 10,
        withdrawalFee: 1,
        createdAt: new Date(),
      });
      console.log("Bot settings initialized in the database.");
    }
    /*
    await tgTasks.insertMany([
      {
        taskId: 1234567890,
        type: "tg",
        isActive: true,
        username: "codingdemos",
        reward: 35,
        performedBy: [],
        createdAt: new Date(),
      },
      {
        taskId: 434374378,
        type: "web",
        isActive: true,
        username: "gill728",
        reward: 35,
        performedBy: [],
        createdAt: new Date(),
      }
    ]);
    */
    
  } catch (e) {
    throw new Error("Error connecting to the database " + e);
  }
};

const CREATE_USER = async (data) => {
  try {
    await users.insertOne(data);
    return true;
  } catch (e) {
    console.log(e);
    return false;
  }
};

const GET_USER = async (user) => {
  try {
    const result = await users.findOne({ user });
    return result;
  } catch (e) {
    console.error("Error getting user!", e);
    return false;
  }
};

const UPDATE_USER = async (user, data) => {
  try {
    const result = await users.updateOne({ user }, data, { upsert: false });
    return result.modifiedCount > 0;
  } catch (e) {
    throw new Error("Error updating user! " + e.message);
  }
};


const FETCH_MERGE_PROFILE = async (user) => {
  try {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    // start of today
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const data = await users
      .aggregate([
        {
          $match: { user },
        },
        {
          $lookup: {
            from: "available-telegram-tasks",
            pipeline: [
              { $match: { isActive: true, performedBy: {$ne: user} }}
            ],
            as: "tgTasks",
          },
        },
        {
          $lookup: {
            from: "withdrawals",
            pipeline: [
              { $match: { user } },
              { $sort: { createdAt: -1 } }
            ],
            as: "withdrawals",
          },
        },
        {
          $lookup: {
            from: "ads-task-history",
            pipeline: [
              { $match: { user } } ,
              {
                $facet: {
                  lastHour: [
                    { $match: { watchedAt: { $gte: oneHourAgo } } },
                    { $count: "count" },
                  ],
                  today: [
                    { $match: { watchedAt: { $gte: todayStart } } },
                    { $count: "count" },
                  ],
                  totalEarned: [
                    { $group: { _id: null, sum: { $sum: "$reward" } } },
                  ],
                  totalCount: [
                    { $count: "count" }
                  ]
                },
              },
              {
                $project: {
                  lastHour: {
                    $ifNull: [{ $arrayElemAt: ["$lastHour.count", 0] }, 0],
                  },
                  today: {
                    $ifNull: [{ $arrayElemAt: ["$today.count", 0] }, 0],
                  },
                  totalEarned: {
                    $ifNull: [{ $arrayElemAt: ["$totalEarned.sum", 0] }, 0],
                  },
                  totalCount: {
                    $ifNull: [{ $arrayElemAt: ["$totalCount.count", 0] }, 0]
                  }
                },
              },
            ],
            as: "adsTaskStats",
          },
        },
        {
          $addFields: {
            adsTaskStats: { $arrayElemAt: ["$adsTaskStats", 0] },
          },
        },
      ])
      .toArray();

    return data;
  } catch (e) {
    console.log("Error fetching merge profile for user " + user, e);
    return [];
  }
};



const ADD_ADS_WATCHED = async (data) => {
  try {
    return await adsTaskHistory.insertOne(data);
  } catch (e) {
   throw new Error("Error registering ads details!"); 
  }
};


const ADD_TASK = async (task) => {
  try {
    return await tgTasks.insertOne(task);
  } catch (e) {
    throw new Error("Error fetching task! "+ e);
  }
};



const GET_TASK = async (taskId) => {
  try {
    return await tgTasks.findOne({ taskId });
  } catch (e) {
    console.log("Error fetching task! ", e);
    return null;
  }
};

const UPDATE_TASK = async (taskId, data) => {
  try {
    const result = await tgTasks.updateOne({ taskId }, data);
    return result.modifiedCount > 0;
  } catch (e) {
    throw new Error("Error updating task! " + e.message);
  }
};


const ADD_WITHDRAWAL = async (data) => {
  try {
    const c = await withdraws.insertOne(data);
    return true;
  } catch (e) {
    console.log(e);
    return false;
  }
};



const GET_WITHDRAWAL = async (withdrawId) => {
  try {
    const c = await withdraws.findOne({withdrawId});
    return c;
  } catch (e) {
    console.log(e);
    return false;
  }
};


const UPDATE_WITHDRAWAL = async (withdrawId, data) => {
  try {
    const result = await withdraws.updateOne({ withdrawId }, data);
    return result.modifiedCount > 0;
  } catch (e) {
    throw new Error("Error updating withdrawal! " + e.message);
  }
};


module.exports = {
  connectDB,
  CREATE_USER,
  GET_USER,
  UPDATE_USER,
  FETCH_MERGE_PROFILE,
  ADD_ADS_WATCHED,
  ADD_TASK,
  GET_TASK,
  UPDATE_TASK,
  ADD_WITHDRAWAL,
  GET_WITHDRAWAL,
  UPDATE_WITHDRAWAL
};
