const cors = require("cors");
const express = require("express");
const mongoose = require("mongoose");
const User = require("./models/User");
const Post = require("./models/Post");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const multer = require("multer");
const uploadMiddleware = multer({ dest: "uploads/" });
const fs = require("fs");

const app = express();

const salt = bcrypt.genSaltSync(10);
const secret = "karivellajamesjsonsecrettoken";

app.use(cors({ credentials: true, origin: ["https://blog-app-mern-back-dri3.onrender.com", "http://localhost:3000"]}));
app.use(express.json());
app.use(cookieParser());
app.use("/uploads", express.static(__dirname + "/uploads"));

mongoose
  .connect(
    "mongodb+srv://karivellajames2022:VpGkb5whNKaF2hPO@cluster0.at1mpay.mongodb.net/?retryWrites=true&w=majority"
  )
  .then((success) => console.log("Db Connected"))
  .catch((e) => console.log(e.message));

app.post("/register", async (req, res) => {
  const { username, password } = req.body;
  try {
    const userDoc = await User.create({
      username,
      password: bcrypt.hashSync(password, salt),
    });
    res.json(userDoc);
  } catch (e) {
    res.status(400).json(e);
  }
});

app.post("/login", async (req, res) => {
  const { username, password } = req.body;
  const userDoc = await User.findOne({ username });
  const passCheck = bcrypt.compareSync(password, userDoc.password);
  // res.json(passCheck)

  if (passCheck) {
    //login
    jwt.sign({ username, id: userDoc.id }, secret, {}, (err, token) => {
      if (err) {
        res.json(err);
      }
      res.cookie("token", token).json({
        id: userDoc._id,
        username,
      });
    });
  } else {
    res.status(400).json("Wrong Credentials");
  }
});

app.get("/profile", (req, res) => {
  const { token } = req.cookies;
  jwt.verify(token, secret, {}, (err, info) => {
    if (err) {
      return res.json(err);
    }
    res.json(info);
  });
});

app.post("/logout", (req, res) => {
  res.cookie("token", "").json("ok");
});

app.post("/post", uploadMiddleware.single("file"), async (req, res) => {
  const { originalname, path } = req.file;
  const parts = originalname.split(".");
  const ext = parts[parts.length - 1];
  const newPath = path + "." + ext;
  fs.renameSync(path, newPath);

  const { token } = req.cookies;
  jwt.verify(token, secret, {}, async (err, info) => {
    if (err) {
      res.json(err);
    }
    const { title, summary, content } = req.body;
    const postDoc = await Post.create({
      title,
      summary,
      content,
      cover: newPath,
      author: info.id,
    });
    res.json(postDoc);
  });
});

app.put("/post", uploadMiddleware.single("file"), async (req, res) => {
  let newPath = null;
  if (req.file) {
    const { originalname, path } = req.file;
    const parts = originalname.split(".");
    const ext = parts[parts.length - 1];
    newPath = path + "." + ext;
    fs.renameSync(path, newPath);
  }

  const { token } = req.cookies;
  jwt.verify(token, secret, {}, async (err, info) => {
    if (err) {
      res.json(err);
    }
    const { id, title, summary, content } = req.body;
    const postDoc = await Post.findById(id);
    const isAuthor = JSON.stringify(postDoc.author) === JSON.stringify(info.id);

    if (!isAuthor) {
      return res.status(400).json("Your are not the author");
    }

    try {
      await Post.findByIdAndUpdate(id, {
        title,
        summary,
        content,
        cover: newPath ? newPath : postDoc.cover,
      });
      res.send("Item Updated!");
    } catch (err) {
      console.error(err.message);
      res.send(400).send("Server Error");
    }
  });
});

app.get("/post", async (req, res) => {
  res.json(
    await Post.find()
      .populate("author", ["username"])
      .sort({ createdAt: -1 })
      .limit(20)
  );
});

app.get("/post/:id", async (req, res) => {
  const { id } = req.params;
  const postDoc = await Post.findById(id).populate("author", ["username"]);
  res.json(postDoc);
});

app.delete("/post/:id", (req, res) => {
  const { id } = req.params;

  const { token } = req.cookies;
  jwt.verify(token, secret, {}, async (err, info) => {
    if (err) {
      res.json(err);
    }

    const postDoc = await Post.deleteOne({
      _id: id,
    });
    res.json(`Post Deleted`);
  });
});

app.listen(4000, () => {
  console.log("server running at localhost 4000");
});

//mongodb+srv://karivellajames2022:password@cluster0.at1mpay.mongodb.net/?retryWrites=true&w=majority
//VpGkb5whNKaF2hPO
