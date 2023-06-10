const express = require("express");
const app = express();
const jwt = require("jsonwebtoken");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const cors = require("cors");
require("dotenv").config();
const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json());

const verifyJWT = (req, res, next) => {
  const authorization = req.headers.authorization;
  if (!authorization) {
    return res
      .status(401)
      .send({ error: true, message: "unauthorized access" });
  }
  // bearer token
  const token = authorization.split(" ")[1];

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res
        .status(401)
        .send({ error: true, message: "unauthorized access" });
    }
    req.decoded = decoded;
    next();
  });
};

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.mzertuj.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();

    const usersCollection = client.db("yogaDb").collection("users");
    const instructorsCollection = client.db("yogaDb").collection("instructors");
    const classesCollection = client.db("yogaDb").collection("classes");

    app.post("/jwt", (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "1h",
      });
      res.send({ token });
    });

    // use verifyJWT before using verifyAdmin
    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      if (user?.role !== "admin") {
        return res
          .status(403)
          .send({ error: true, message: "forbidden message" });
      }
      next();
    };

    // send feedback instructor
    // feedback , denied , approved
    app.patch(
      "/feedback/admin/:id",
      verifyJWT,
      verifyAdmin,
      async (req, res) => {
        const doc = req.body;
        const id = req.params.id;
        const filter = { _id: new ObjectId(id) };
        const updateDoc = {
          $set: {
            feedback: doc.feedback,
          },
        };
        const result = await instructorsCollection.updateOne(filter, updateDoc);
        res.send(result);
      }
    );

    // instructors related apis
    // (AddItem components data)-clinet going (instructorsCollection)-server
    // TODO: verifyJWT, verifyAdmin
    app.post("/instructors", async (req, res) => {
      const newItem = req.body;
      const result = await instructorsCollection.insertOne(newItem);
      res.send(result);
    });

    app.get("/instructors", async (req, res) => {
      const result = await instructorsCollection.find().toArray();
      res.send(result);
    });

    // update mytoys data
    app.put("/instructors/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const info = req.body;
      const updateClasses = {
        $set: {
          price: info.price,
          seat: info.seat,
          className: info.className,
        },
      };
      const result = await instructorsCollection.updateOne(
        filter,
        updateClasses
      );
      res.send(result);
    });

    // send specific data for update
    app.get("/instructors/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await instructorsCollection.findOne(query);
      res.send(result);
    });

    // feedback , denied , approved
    app.patch(
      "/approvedinstructors/admin/:id",
      verifyJWT,
      verifyAdmin,
      async (req, res) => {
        const id = req.params.id;
        const filter = { _id: new ObjectId(id) };
        const updateDoc = {
          $set: {
            status: "approved",
          },
        };
        const result = await instructorsCollection.updateOne(filter, updateDoc);
        res.send(result);
      }
    );

    // feedback , denied , approved
    app.patch(
      "/deniedinstructors/admin/:id",
      verifyJWT,
      verifyAdmin,
      async (req, res) => {
        const id = req.params.id;
        const filter = { _id: new ObjectId(id) };
        const updateDoc = {
          $set: {
            status: "denied",
          },
        };
        const result = await instructorsCollection.updateOne(filter, updateDoc);
        res.send(result);
      }
    );

    // when admin aproved class that class are gone in classes
    app.post("/classes", async (req, res) => {
      const doc = req.body;
      const result = await classesCollection.insertOne(doc);
      res.send(result);
    });

    // sending user by specific email
    // app.get("/users", async (req, res) => {
    //   const email = req.query.email;
    //   if (!email) {
    //     res.send([]);
    //   }
    //   const query = { email: email };
    //   const result = await usersCollection.find(query).toArray();
    //   res.send(result);
    // });

    // users realated apis
    app.get("/users", verifyJWT, verifyAdmin, async (req, res) => {
      const result = await usersCollection.find().toArray();
      console.log(result);
      res.send(result);
    });

    // send specific data to client for only instructor pages
    app.get("/instructorusers", async (req, res) => {
      const query = { role: "instructor" };
      const result = await usersCollection.find(query).limit(6).toArray();
      res.send(result);
    });

    // checking which user is admin
    // security layer: verify jwt
    // same email
    // check admin
    app.get("/users/admin/:email", verifyJWT, async (req, res) => {
      const email = req.params.email;
      console.log(req.decoded.email, req.params.email);
      const query = { email: email };

      if (email !== req.decoded.email) {
        res.send({ admin: false });
      }

      const user = await usersCollection.findOne(query);
      console.log(user);
      const result = { admin: user?.role === "admin" };
      res.send(result);
    });

    app.get("/users/instructor/:email", verifyJWT, async (req, res) => {
      const email = req.params.email;
      console.log(req.decoded.email, req.params.email);
      const query = { email: email };

      if (email !== req.decoded.email) {
        res.send({ admin: false });
      }

      const user = await usersCollection.findOne(query);
      console.log(user);
      const result = { admin: user?.role === "instructor" };
      res.send(result);
    });

    // if user already created this site then he never crate user in this site thats mean he is existing user
    // when user create with email and password and also googleLogin both user information will store in database and each user create user just only one time
    app.post("/users", async (req, res) => {
      const user = req.body;
      console.log(user);
      const query = { email: user.email };
      const existingUser = await usersCollection.findOne(query);
      console.log("existingUser is ", existingUser);
      if (existingUser) {
        return res.send({ message: "user already exists" });
      }
      const result = await usersCollection.insertOne(user);
      res.send(result);
    });

    // who is admin and who is user part
    app.patch("/users/admin/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          role: "admin",
        },
      };
      const result = await usersCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    app.patch("/users/instructor/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          role: "instructor",
        },
      };
      const result = await usersCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    app.patch("/users/student/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          role: "student",
        },
      };
      const result = await usersCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("ŌmBliss Yoĝa is running");
});

app.listen(port, () => {
  console.log(`ŌmBliss Yoĝa is sitting on port ${port}`);
});
