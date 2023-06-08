const express = require("express");
const app = express();
const cors = require("cors");
// const jwt = require("jsonwebtoken");
require("dotenv").config();
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion } = require('mongodb');

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
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();


    const ourClassesCollection = client.db("danceDb").collection("category");
    const classesCollection = client.db("danceDb").collection("danceClasses");
    const instructorsCollection = client.db("danceDb").collection("instructors");

   
    app.get('/ourClasses', async (req, res) => {
      try {
        // Retrieve data from the collection
        const result = await ourClassesCollection.find().toArray();
        res.send(result);
      } catch (error) {
        console.error('Error retrieving data:', error);
        res.status(500).send('Internal Server Error');
      }
    });


    app.get('/classes', async (req, res) => {
      try {
        const result = await classesCollection.find().toArray();
        res.send(result);
      } catch (error) {
        console.error('Error fetching classes:', error);
        res.status(500).send('Internal Server Error');
      }
    });

    app.get('/instructors', async (req, res) => {
      try {
        const result = await instructorsCollection.find().toArray();
        res.send(result);
      } catch (error) {
        console.error('Error fetching instructors:', error);
        res.status(500).send('Internal Server Error');
      }
    });





    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
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