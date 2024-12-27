const { MongoClient, ServerApiVersion } = require('mongodb');
const uri = "mongodb+srv://b022210122:nogizakabrian@cluster0.wmjlp.mongodb.net/?retryWrites=true&w=majority&tls=true&appName=Cluster0";

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
  tls: true,
  tlsAllowInvalidCertificates: false, // Set to true if using self-signed certificates
});

module.exports = client