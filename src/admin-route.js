const express = require("express");
const session = require("express-session");
const router = express.Router();
const { GET_USER, FETCH_DASHBOARD, FETCH_ALL_USER, FETCH_ALL_TASK, FETCH_ALL_WITHDRAWAL, UPDATE_USER, UPDATE_WITHDRAWAL, ADD_TASK, EDIT_TASK, DELETE_TASK } = require("../database/db");
const bcrypt = require("bcrypt");
router.use(express.urlencoded({ extended: true}));


function convertNumbers(obj) {
  const result = {};
  for (const [key, value] of Object.entries(obj)) {

    if (value === ''){
        result[key] = value;
        continue;
    }

    if (Array.isArray(value)) {
      result[key] = value.map(v => {
        if (v === '') return v;
        return isNaN(v) ? v : Number(v);
      });
    } else {
      result[key] = isNaN(value) ? value : Number(value);
    }
  }
  return result;
}



router.use(session({
    secret: "347rguer76347832893287^&^tyty67^&dhgegdhug3y376676e67",
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 1000 * 60 * 30,
        httpOnly: true,
        secure: false
    }
}));


router.use((req, res, next) => {
    //req.session.admin = true;
    next();
});



router.get('/', (req, res) => {
    if (req.session.admin !== true){
        return res.redirect("/admin/login.html");
    }
    return res.redirect("/admin/dashboard");
});



router.post('/login', async (req, res) => {
    const { u, p } = req.body;
    try {
        if (!u || u === '' || !p || p === ''){
            throw new Error("Please provide valid login details!");
        }
        const admin = await GET_USER("bot");
        if (!admin){
            throw new Error("Bot configuration has not been set up!");
        }
        const { username, password } = admin;
        if (username !== u){
            throw new Error("Incorrect username!");
        }
        if (await bcrypt.compare(p, password)){
            req.session.admin = true;
            return res.status(200).send("");
        }
        throw new Error("Incorrect Password!");
    } catch (e) {
        res.status(500).send(e.message || "Internal server error!");
    }
});





router.use((req, res, next) => {
    if (req.session.admin !== true){
        return res.redirect("/admin/login.html");
    };
    next();
});



router.get('/dashboard', async (req, res) => {
    if (req.session.admin !== true){
        return res.redirect("/admin/login.html");
    }

    let { page } = req.query;
    const list = ["users", "tg_tasks", "withdraws", "settings"];
    if (!list.includes(page)) page = "dashboard";

    /*
    const bot = await GET_USER("bot", null, {_id: 0, password: 0, isActive: 0, createdAt: 0, user: 0});

    console.log(bot);

    if (!bot){
        return res.render("error", { message: "Couldn't fetch admin settings!" });
    }
*/

    let data = {};

    if (page === "dashboard"){
        data = await FETCH_DASHBOARD();
    } else if (page === "users"){
        data.users = await FETCH_ALL_USER();
    } else if (page === "tg_tasks"){
        data.tasks = await FETCH_ALL_TASK();
    } else if (page === "withdraws"){
        data.withdraws = await FETCH_ALL_WITHDRAWAL();
    } else if (page === "settings"){
        data = await GET_USER("bot", null, {_id: 0, password: 0, isActive: 0, createdAt: 0, user: 0});
        if(!data){
            return res.render("error", { message: "Couldn't fetch admin settings!" });
        };
    };
    data.page = page;

    console.log(data);

    return res.render("dashboard", data);
});





router.post('/settings', async (req, res) => {
    let newDatas = req.body;
    if (!newDatas){
        return res.status(400).send("Invalid admin request!");
    };

    if (newDatas.daysEarning){
        newDatas.daysEarning = JSON.parse(newDatas.daysEarning).map(d => d.value);
    }else{
        newDatas.daysEarning = [];
    };

    if (newDatas.directLinks){
        newDatas.directLinks = JSON.parse(newDatas.directLinks).map(d => d.value);
    }else{
        newDatas.directLinks = [];
    };

    if (newDatas.password){
        newDatas.password = await bcrypt.hash(newDatas.password, 10);
        req.session.destroy();
        res.clearCookie("connet.sid");
    }else{
        delete newDatas.password;
    };
    newDatas = convertNumbers(newDatas);
    await UPDATE_USER("bot", {
        $set: newDatas
    });
    console.log("SETTINGS UPDATED")
    newDatas.page = "settings";
    res.redirect("/admin/dashboard?page=settings");
});




router.post("/change-withdrawal-status", async (req, res) => {
    const { withdrawStatusId, status } = req.body;
    if (!withdrawStatusId, !status){
        return;
    };
    console.log(req.body);
      await UPDATE_WITHDRAWAL(withdrawStatusId, {
        $set: {
          status
        }
      });
    res.redirect("/admin/dashboard?page=withdraws");
});


router.post("/update-balance", async (req, res) => {
    const { user_id, balance } = req.body;
    if (!user_id || !balance){
        return;
    };
    console.log(req.body);
      await UPDATE_USER(Number(user_id), {
        $set: {
          balance: parseFloat(balance)
        }
      });
    res.redirect("/admin/dashboard?page=users");
});



router.post("/task", async (req, res) => {
    const which = req.query.type;

    if (!which){
        return res.statusCode(400);
    };

    const { add_id, username, reward, type } = req.body;

    if (!username || !reward || !type){
        return res.statusCode(400);
    };

    const taskId = Math.floor( 1000000000 + Math.random() * 9000000000)

    if (which === "create"){
        await ADD_TASK({
            taskId,
            type,
            isActive: true,
            username: username.startsWith('@') ? username.replace("@", "") : username,
            reward: parseFloat(reward),
            performedBy: [],
            createdAt: new Date()
        });

        console.log("Task added! ID: "+taskId);

    } else {

        if (!add_id){
            return res.statusCode(400);
        }

        await EDIT_TASK(Number(add_id), {
            $set: {
                username,
                reward: parseFloat(reward),
                type
            }
        });

        console.log("Task edited! ID: "+taskId);
    }

    res.redirect("/admin/dashboard?page=tg_tasks");

});


router.get('/task', async (req, res) => {
    const { id, type } = req.query;
    if (!id || !type){
        return;
    };
    await DELETE_TASK(Number(id));
    return res.redirect("/admin/dashboard?page=tg_tasks");
});


module.exports = router;