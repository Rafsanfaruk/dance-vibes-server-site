const express = require("express");
const app = express();
const cors = require("cors");
// const jwt = require("jsonwebtoken");
require("dotenv").config();
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

// middleware
app.use(cors());
app.use(express.json());

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

    // users
    app.get('/users',async(req,res) => {
      const result = await usersCollection.find().toArray();
      res.send(result);
    })

    app.post('/users',async(req,res) =>{
      const user =req.body;
      const query ={email:user.email}
      const existingUser =await usersCollection.findOne(query);
      if(existingUser){
        return res.send({message:'user already exists'})
      }
      const result =await usersCollection.insertOne(user);
      res.send(result);
    })

    app.patch('/users/admin/:id',async(req,res) =>{
      const id = req.params.id;
      console.log(id);
      const filter ={_id: new ObjectId(id)};
      const updatedDoc ={
        $set:{
          role: 'admin',
        },
      }
      const result =await usersCollection.updateOne(filter, updatedDoc);
      res.send(result);
    })

    // app.patch('/users/:id/make-instructor', async (req, res) => {
    //   try {
    //     const userId = req.params.id;
    //     const result = await usersCollection.findOneAndUpdate(
    //       { _id: new ObjectId(userId) },
    //       { $set: { role: "instructor" } },
    //       { returnOriginal: false }
    //     );
    //     if (!result.value) {
    //       return res.status(404).json({ message: "User not found" });
    //     }
    //     res.json(result.value);
    //   } catch (error) {
    //     console.error("Error updating user role:", error);
    //     res.status(500).json({ message: "Failed to update user role" });
    //   }
    // });

    // app.patch('/users/:id/make-admin', async (req, res) => {
    //   try {
    //     const userId = req.params.id;
    //     const result = await usersCollection.findOneAndUpdate(
    //       { _id: new ObjectId(userId) },
    //       { $set: { role: "admin" } },
    //       { returnOriginal: false }
    //     );
    //     if (!result.value) {
    //       return res.status(404).json({ message: "User not found" });
    //     }
    //     res.json(result.value);
    //   } catch (error) {
    //     console.error("Error updating user role:", error);
    //     res.status(500).json({ message: "Failed to update user role" });
    //   }
    // });





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

    app.get("/classes", async (req, res) => {
      try {
        const result = await classesCollection.find().toArray();
        res.send(result);
      } catch (error) {
        console.error("Error fetching classes:", error);
        res.status(500).send("Internal Server Error");
      }
    });

    // Instructors

    app.get("/instructors", async (req, res) => {
      try {
        const result = await instructorsCollection.find().toArray();
        res.send(result);
      } catch (error) {
        console.error("Error fetching instructors:", error);
        res.status(500).send("Internal Server Error");
      }
    });

    //  cart

    app.get("/carts", async (req, res) => {
      const email = req.query.email;
      // console.log(email);
      if (!email) {
        res.send([]);
      }
      const query = { email: email };
      const result = await cartCollection.find(query).toArray();
      res.send(result);
    });

    app.post("/carts", async (req, res) => {
      const classItem = req.body;
      console.log(classItem);
      const result = await cartCollection.insertOne(classItem);
      res.send(result);
    });

    app.delete("/carts/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await cartCollection.deleteOne(query);
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

// mongodb end

app.get("/", (req, res) => {
  res.send("Welcome to dance vibes");
});

app.listen(port, () => {
  console.log(`Dance Vibes listening on port: ${port}`);
});
