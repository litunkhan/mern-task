const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
const bcrypt = require("bcrypt");
const app = express();
app.use(cors());
app.use(express.json());
const jwt = require('jsonwebtoken');
const port = process.env.PORT || 5000;

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.6scxok5.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
  useNewUrlParser: true,
  useUnifiedTopology: true,
  maxPoolSize: 10,
});

async function run() {
  try {
    await client.connect((error) => {
      if (error) {
        console.error(error);
        return;
      }
    });

    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );

    const usersCollections = client.db("blogsite").collection("users");
    const blogCollections = client.db("blogsite").collection("allpostedblogs");
   
    app.get("/", (req, res) => {
      res.send("app running");
    });

  


    app.post('/login', async (req, res) => {
        try {
          const { username, password } = req.body;
          
          // Retrieve the user from the database
          const user = await usersCollections.findOne({ username });
          if (!user) {
            return res.status(401).json({ message: 'Invalid credentials' });
          }
          const isPasswordValid = await bcrypt.compare(password, user.password);

          if (!isPasswordValid) {
            return res.status(401).json({ message: 'Invalid credentials' });
          }
      
         // Generate a JWT token
          const token = jwt.sign({ userId: user._id }, process.env.ACCESS_TOKEN, { expiresIn: '10h' });
      
          res.json({ message: 'Login successful', token ,user:user});
        } catch (error) {
          res.status(500).json({ error: 'An error occurred' });
        }
      });
      
      
  app.post("/register", async (req, res) => {
      try {
        const user = req.body;

        // Check if the user already exists
        const query = { email: user.username };
        const exsistingUser = await usersCollections.findOne(query);
        if (exsistingUser) {
          return res.status(400).json({ message: "User already exists" });
        }

        // Hash the password for  securely
        const hashedPassword = await bcrypt.hash(user.password, 10);

        // Insert the user into the database
        const result = await usersCollections.insertOne({
          email: user.email,
          username: user.username,
          password:hashedPassword,
        });
        

        res.status(201).json({ message: "User registered successfully",result});
      } catch (error) {
        res.status(500).json({ error: "An error occurred" });
      }
    });

    app.post('/blogpost', async(req,res)=>{
      const blogs = req.body
      const result = await blogCollections.insertOne(blogs)
      res.send(result)
  })

    app.get("/getblog", async (req, res) => {
      const result = await blogCollections.find({}).toArray();
      res.send(result);
    });


    app.get('/myblogs',async(req,res)=>{
      const email = req.query.email
      
       
      const quierys = {email:email}
      const result = await blogCollections.find(quierys).toArray()
      console.log(quierys)
      res.send(result)
    })

    app.delete('/myblogs/:id', async(req,res)=>{
      const id = req.params.id
      const query = {_id: new ObjectId(id)}
      const result = await blogCollections.deleteOne(query)
      res.send(result)
    })

    app.get('/singleblog/:id',async(req,res)=>{
      const id = req.params.id
       const quary = {_id: new ObjectId(id)}
       const result = await blogCollections.findOne(quary)
       res.send(result)
    })


    app.put('/updateblog/:id',async(req,res)=>{
      const id = req.params.id
      const user = req.body
      const filter = {_id: new ObjectId(id)}
      const options = {upsert:true}
      const updatedUser ={
        $set: {
       title:user.title,
       image:user.image,
       discribtion:user.discribtion
    },
      }
      const result = await blogCollections.updateOne(filter,updatedUser,options)
      res.send(result)
 
   })


   app.patch('/api/posts/:postId', async (req, res) => {
    const postId = req.params.postId;
    const { username, text } = req.body;
  
    try {
      const result = await blogCollections.updateOne(
        { _id: new ObjectId(postId) },
        { $push: { comment: { username, text } } }
      );
      res.status(200).json(result);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'An error occurred while adding the comment.' });
    }
  });

  app.patch('/api/posts/:postId/like/:userId', async (req, res) => {
    const postId = req.params.postId;
    const userId = req.params.userId;
  
    try {
      const result = await blogCollections.updateOne(
        { _id: new ObjectId(postId) },
        { $push: { like: userId } }
      );
      res.status(200).json(result);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'An error occurred while updating likes.' });
    }
  });

    app.listen(port, () => {
      console.log("app is running");
    });
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);
