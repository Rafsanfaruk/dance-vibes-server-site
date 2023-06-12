const express = require("express");
const app = express();
const cors = require("cors");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const stripe = require("stripe")(process.env.PAYMENT_SECRET_KEY)

// middleware
app.use(cors());
app.use(express.json());

const verifyJWT = (req, res, next) => {
  const authorization = req.headers.authorization;
  if (!authorization) {
    return res
      .status(401)
      .send({ error: true, message: "Invalid authorization" });
  }
  const token = authorization.split(" ")[1];
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).send({ error: true, message: "Invalid access" });
    }
    req.decoded = decoded;
    next();
  });
};

// mongodb start

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.luzjykj.mongodb.net/?retryWrites=true&w=majority`;

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
    await client.connect();

    const ourClassesCollection = client.db("danceDb").collection("category");
    const classesCollection = client.db("danceDb").collection("danceClasses");
    const instructorsCollection = client.db("danceDb").collection("instructors");
    const cartCollection = client.db("danceDb").collection("carts");
    const usersCollection = client.db("danceDb").collection("users");
    const paymentCollection = client.db("danceDb").collection("payments");


    // token jwt token

    app.post("/jwt", (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "2h",
      });
      res.send({ token });
    });

// verify admin

    const verifyAdmin =async(req, res, next) => {
        const email =req.decoded.email;
        const query ={email: email}
        const user = await usersCollection.findOne(query);
        if(user?.role !== 'admin'){
          return res.status(403).send({error:true,message:'forbidden access '});
        }
        next();
    }

    // verify instructor
    const verifyInstructor = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      if (user?.role !== 'instructor') {
        return res.status(403).send({ error: true, message: 'Forbidden access' });
      }
      next();
    };
    

    // users
    app.get("/users",verifyJWT,verifyAdmin,async (req, res) => {
      const result = await usersCollection.find().toArray();
      res.send(result);
    });

    app.post("/users", async (req, res) => {
      const user = req.body;
      const query = { email: user.email };
      const existingUser = await usersCollection.findOne(query);
      if (existingUser) {
        return res.send({ message: "user already exists" });
      }
      const result = await usersCollection.insertOne(user);
      res.send(result);
    });

    app.get("/users/admin/:email", verifyJWT, async (req, res) => {
      const email = req.params.email;
      if (req.decoded.email !== email) {
        res.send({ admin: false });
      }
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      const result = { admin: user?.role === "admin" };
      res.send(result);
    });

    app.patch("/users/admin/:id", async (req, res) => {
      const id = req.params.id;
      // console.log(id);
      const filter = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          role: "admin",
        },
      };
      const result = await usersCollection.updateOne(filter, updatedDoc);
      res.send(result);
    });

    // instructor
   
    
    app.get("/users/instructor/:email", verifyJWT, async (req, res) => {
      const email = req.params.email;
      if (req.decoded.email !== email) {
        res.send({ instructor: false });
      }
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      const result = { instructor: user?.role === "instructor" };
      res.send(result);
    });
    
    app.patch("/users/instructor/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const update = { $set: { role: "instructor" } };
    
      const result = await usersCollection.updateOne(filter, update);
    
      res.send(result);
    });
    
    
    // -----------------------

    app.get("/ourClasses", async (req, res) => {
      try {
        // Retrieve data from the collection
        const result = await ourClassesCollection.find().toArray();
        res.send(result);
      } catch (error) {
        console.error("Error retrieving data:", error);
        res.status(500).send("Internal Server Error");
      }
    });
    // classes

    // app.get("/classes", async (req, res) => {
    //   try {
    //     const result = await classesCollection.find().toArray();
    //     res.send(result);
    //   } catch (error) {
    //     console.error("Error fetching classes:", error);
    //     res.status(500).send("Internal Server Error");
    //   }
    // });
    // GET all classes
app.get("/classes", async (req, res) => {
  try {
    const result = await classesCollection.find().toArray();
    res.send(result);
  } catch (error) {
    console.error("Error fetching classes:", error);
    res.status(500).send("Internal Server Error");
  }
});

// image store danceClasses

app.post('/classes',verifyJWT,verifyInstructor, async (req, res) => {
  try {
    const danceItem = req.body;
    const result = await classesCollection.insertOne(danceItem);
    res.send(result);
  } catch (error) {
    res.status(500).send({ error: 'An error occurred while adding the dance item.' });
  }
});

// PATCH route to approve a class
app.patch("/classes/:id/approve", async (req, res) => {
  const { id } = req.params;
  try {
    await classesCollection.updateOne(
      { _id: ObjectId(id) },
      { $set: { status: "approved" } }
    );
    res.sendStatus(200);
  } catch (error) {
    console.error("Error approving class:", error);
    res.status(500).send("Internal Server Error");
  }
});

// PATCH route to deny a class
app.patch("/classes/:id/deny", async (req, res) => {
  const { id } = req.params;
  try {
    await classesCollection.updateOne(
      { _id: ObjectId(id) },
      { $set: { status: "denied" } }
    );
    res.sendStatus(200);
  } catch (error) {
    console.error("Error denying class:", error);
    res.status(500).send("Internal Server Error");
  }
});

// POST route to send feedback to an instructor
app.post("/feedback/:instructorId", async (req, res) => {
  const { instructorId } = req.params;
  const { feedback } = req.body;
  try {
    // Logic to send feedback to the instructor
    // ...

    res.sendStatus(200);
  } catch (error) {
    console.error("Error sending feedback:", error);
    res.status(500).send("Internal Server Error");
  }
});

    

    // Instructors

    app.get("/instructor", async (req, res) => {
      try {
        const result = await instructorsCollection.find().toArray();
        res.send(result);
      } catch (error) {
        console.error("Error fetching instructors:", error);
        res.status(500).send("Internal Server Error");
      }
    });
    // app.get("/instructor", async (req, res) => {
    //   try {
    //     const result = await instructorsCollection.find().toArray();
    //     res.send(result); // Sending the response here
    //     // ...
    //     // Some other code
    //     // ...
    //     res.send("Another response"); // Trying to send another response here (causing the error)
    //   } catch (error) {
    //     console.error("Error fetching instructors:", error);
    //     res.status(500).send("Internal Server Error");
    //   }
    // });

    //  cart

    app.get("/carts", verifyJWT, async (req, res) => {
      const email = req.query.email;
      // console.log(email);
      if (!email) {
        res.send([]);
      }

      const decodedEmail = req.decoded.email;
      if (email !== decodedEmail) {
        return res
          .status(403)
          .send({ error: true, message: "forbidden access" });
      }

      const query = { email: email };
      const result = await cartCollection.find(query).toArray();
      res.send(result);
    });

    app.post("/carts", async (req, res) => {
      const classItem = req.body;
      // console.log(classItem);
      const result = await cartCollection.insertOne(classItem);
      res.send(result);
    });

    app.delete("/carts/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await cartCollection.deleteOne(query);
      res.send(result);
    });
// payments
 //  Create payment intent

 app.post("/create-payment-intent", verifyJWT, async (req, res) => {
  const { price } = req.body;
  const amount = parseInt(price * 100);

  // console.log(price,amount);

  const paymentIntent = await stripe.paymentIntents.create({
    amount: amount,
    currency: "USD",
    payment_method_types: ["card"],
  });

  res.send({
    clientSecret: paymentIntent.client_secret,
  });
});

// payment related api

app.post("/payments", verifyJWT, async (req, res) => {
  const payment = req.body;
  const insetResult = await paymentCollection.insertOne(payment);

  const query = {
    _id: { $in: payment.cartItems.map((id) => new ObjectId(id)) },
  };
  const deleteResult = await cartCollection.deleteMany(query);

  res.send({ insetResult, deleteResult });
});

app.get("/admin-stats",verifyJWT,verifyAdmin, async (req, res) => {
  const users = await usersCollection.estimatedDocumentCount();
  const products = await classesCollection.estimatedDocumentCount();
  const orders = await paymentCollection.estimatedDocumentCount();

  
  const payments =await paymentCollection.find().toArray();
  const revenue =payments.reduce((sum,payment) =>sum+payment.price,0)

  res.send({
    revenue,
    users,
    products,
    orders,
  });
});

app.get('/order-stats', verifyJWT,verifyAdmin,  async(req, res) =>{
  const pipeline = [
    {
      $lookup: {
        from: 'classes',
        localField: 'classesItems',
        foreignField: '_id',
        as: 'classesItemsData'
      }
    },
    {
      $unwind: '$classesItemsData',
    },
    {
      $group: {
        _id: '$classesItemData.category',
        count: { $sum: 1 },
        total: { $sum: '$classesItemData.price' }
      }
    },
    {
      $project: {
        category: '$_id',
        count: 1,
        total: { $round: ['$total', 2] },
        _id: 0
      }
    }
  ];

  const result = await paymentCollection.aggregate(pipeline).toArray()
  res.send(result)

})

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

// mongodb end

app.get("/", (req, res) => {
  res.send("Welcome to dance vibes");
});

app.listen(port, () => {
  console.log(`Dance Vibes listening on port: ${port}`);
});
