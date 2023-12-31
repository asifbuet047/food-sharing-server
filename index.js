const PORT = process.env.PORT || 5000;
const express = require('express');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const cors = require('cors');
const cookieParser = require('cookie-parser');
require('dotenv').config();
const jwt = require('jsonwebtoken');

const clientRequestHandler = express();
const JWT_SECRET = process.env.JWT_SECRECT_KEY;

const community_foods_database_name = 'communityfoods';
const donated_foods_collection_name = 'donated_foods';
const requested_foods_collection_name = 'requested_foods';


//middlewares
clientRequestHandler.use(cors({
    origin: ['http://localhost:5173', 'https://assignment-11-community-foods.web.app/'],
    credentials: true,
}));
clientRequestHandler.use(cookieParser());
clientRequestHandler.use(express.json());

//token verification custom middleware
const verifyUser = (request, response, next) => {
    const token = request.cookies?.ACCESS_TOKEN;
    if (token) {
        jwt.verify(token, JWT_SECRET, {
            algorithms: 'HS512',
            expiresIn: '1d',
        }, (error, decoded) => {
            if (decoded) {
                response.user = decoded;
                next();
            }
            if (error) {
                response.status(401).send({ message: 'Unauthorized user' });
            }
        })
    } else {
        return response.status(401).send({ message: 'Unauthorized user' });
    }
}

const uri = `mongodb+srv://${process.env.MONGODB_USERNAME}:${process.env.MONGODB_PASSWORD}@cluster0.2jixdw6.mongodb.net/?retryWrites=true&w=majority`;

const mongoClient = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});


clientRequestHandler.post('/api/v1/token', (request, response) => {
    jwt.sign(request.body, JWT_SECRET, {
        algorithm: 'HS512',
        expiresIn: '1d',
    }, (error, token) => {
        if (token) {
            response.cookie('ACCESS_TOKEN', token, { httpOnly: true, secure: true, sameSite: 'none' }).send({ user: 'valid', token });
        } else {
            response.send({ user: 'unauthorized', error: error });
        }
    });
});


clientRequestHandler.get('/', async (request, response) => {
    try {
        await mongoClient.connect();
        const donated_foods = mongoClient.db(community_foods_database_name).collection(donated_foods_collection_name);
        const all_foods = await donated_foods.find().toArray();
        response.send(all_foods);

    } catch (error) {
        response.send({ message: error });
    } finally {
        mongoClient.close();
    }
});
clientRequestHandler.get('/seachfood', async (request, response) => {
    try {
        await mongoClient.connect();
        const name = request.query.name;
        const refinedName = name.charAt(0).toUpperCase() + name.slice(1);
        const query = { food_name: refinedName };
        console.log(query);
        const donated_foods = mongoClient.db(community_foods_database_name).collection(donated_foods_collection_name);
        const searched_foods = await donated_foods.find(query).sort({ food_quantity: -1 }).toArray();
        response.send(searched_foods);
    } catch (error) {
        console.log(error);
    } finally {
        mongoClient.close();
    }
});
clientRequestHandler.get('/featuredfoods', async (request, response) => {
    try {
        await mongoClient.connect();
        const query = { food_status: true };
        const donated_foods = mongoClient.db(community_foods_database_name).collection(donated_foods_collection_name);
        const featured_foods = await donated_foods.find(query).sort({ food_quantity: -1 }).limit(6).toArray();
        response.send(featured_foods);
    } catch (error) {
        console.log(error);
    } finally {
        mongoClient.close();
    }
});
clientRequestHandler.get('/sortfoods', async (request, response) => {
    try {
        await mongoClient.connect();
        const donated_foods = mongoClient.db(community_foods_database_name).collection(donated_foods_collection_name);
        const sort_foods = await donated_foods.find().sort({ food_quantity: -1 }).limit(6).toArray();
        response.send(sort_foods);
    } catch (error) {
        console.log(error);
    } finally {
        mongoClient.close();
    }
});
clientRequestHandler.get('/availablefoods', async (request, response) => {
    try {
        await mongoClient.connect();
        const query = { food_status: true };
        const page = parseInt(request.query.page);
        const limit = parseInt(request.query.limit);
        const donated_foods = mongoClient.db(community_foods_database_name).collection(donated_foods_collection_name);
        const totalCount = await donated_foods.estimatedDocumentCount();
        const available_foods = await donated_foods.find(query).sort({ food_quantity: -1 }).skip((page - 1) * limit).limit(limit).toArray();
        const data = { available_foods, currentCount: available_foods.length, totalCount: totalCount };
        response.send(data);
    } catch (error) {
        console.log(error);
    } finally {
        mongoClient.close();
    }
});
clientRequestHandler.get('/foodcount', async (request, response) => {
    try {
        await mongoClient.connect();
        const donated_foods = mongoClient.db(community_foods_database_name).collection(donated_foods_collection_name);
        const totalCount = await donated_foods.estimatedDocumentCount();
        const data = { totalCount: totalCount };
        response.send(data);
    } catch (error) {
        console.log(error);
    } finally {
        mongoClient.close();
    }
});
clientRequestHandler.get('/food/:id', verifyUser, async (request, response) => {
    try {
        await mongoClient.connect();
        const food_id = request.params.id;
        const query = { _id: new ObjectId(food_id) };
        const donated_foods = mongoClient.db(community_foods_database_name).collection(donated_foods_collection_name);
        const food = await donated_foods.findOne(query);
        response.send(food);
    } catch (error) {
        console.log(error);
    } finally {
        mongoClient.close();
    }
});
clientRequestHandler.post('/foodStatusUpdate/:id', verifyUser, async (request, response) => {
    try {
        await mongoClient.connect();
        const food_id = request.params.id;
        const updateField = request.body;
        const query = { _id: new ObjectId(food_id) };
        let update;
        if (updateField.food_status === 'true') {
            update = {
                $set: {
                    food_status: true
                }
            };
        } else {
            update = {
                $set: {
                    food_status: false
                }
            };
        }
        const status_dpdated = mongoClient.db(community_foods_database_name).collection(donated_foods_collection_name);
        const food = await status_dpdated.updateOne(query, update);
        console.log(food);
        response.send(food);
    } catch (error) {
        console.log(error);
    } finally {
        mongoClient.close();
    }
});
clientRequestHandler.get('/manage/:id', verifyUser, async (request, response) => {
    try {
        await mongoClient.connect();
        const foodId = request.params.id;
        const query = { food_id: foodId };
        const manage_foods = mongoClient.db(community_foods_database_name).collection(requested_foods_collection_name);
        const food = await manage_foods.find(query).toArray();
        response.send(food);
    } catch (error) {
        console.log(error);
    } finally {
        mongoClient.close();
    }
});
clientRequestHandler.get('/requestedfood', verifyUser, async (request, response) => {
    try {
        await mongoClient.connect();
        const requested_user_email = request.query.mail;
        const query = { requested_user_email };
        console.log(query);
        const requested_foods = mongoClient.db(community_foods_database_name).collection(requested_foods_collection_name);
        const food = await requested_foods.find(query).toArray();
        console.log(food);
        response.send(food);
    } catch (error) {
        console.log(error);
    } finally {
        mongoClient.close();
    }
});
clientRequestHandler.get('/myfoods/:email', verifyUser, async (request, response) => {
    try {
        await mongoClient.connect();
        const donator_email = request.params.email;
        const query = { donator_email: donator_email };
        const donated_foods = mongoClient.db(community_foods_database_name).collection(donated_foods_collection_name);
        const food = await donated_foods.find(query).sort({ food_quantity: -1 }).toArray();
        console.log(food);
        response.send(food);
    } catch (error) {
        console.log(error);
    } finally {
        mongoClient.close();
    }
});
clientRequestHandler.get('/myfoodrequest', verifyUser, async (request, response) => {
    try {
        await mongoClient.connect();
        const donar_mail = request.query.email;
        const query = { requested_user_email: donar_mail };
        const donated_foods = mongoClient.db(community_foods_database_name).collection(requested_foods_collection_name);
        const food = await donated_foods.find(query).toArray();
        console.log(food);
        response.send(food);
    } catch (error) {
        console.log(error);
    } finally {
        mongoClient.close();
    }
});
clientRequestHandler.delete('/deleterequest/:id', verifyUser, async (request, response) => {
    try {
        await mongoClient.connect();
        const id = request.params.id;
        const query = { _id: new ObjectId(id) };
        const deleted_request = mongoClient.db(community_foods_database_name).collection(requested_foods_collection_name);
        const food = await deleted_request.deleteOne(query);
        console.log(food);
        response.send(food);
    } catch (error) {
        console.log(error);
    } finally {
        mongoClient.close();
    }
});


clientRequestHandler.post('/deletefood', verifyUser, async (request, response) => {
    try {
        await mongoClient.connect();
        const id = request.body;
        const query = { _id: new ObjectId(id.food_id) };
        console.log(query);
        const deleted_food = mongoClient.db(community_foods_database_name).collection(donated_foods_collection_name);
        const note = await deleted_food.deleteOne(query);
        console.log(note);
        response.send(note);
    } catch (error) {
        console.log(error);
    } finally {
        mongoClient.close();
    }
});


clientRequestHandler.post('/requestfood', verifyUser, async (request, response) => {
    try {
        await mongoClient.connect();
        const requestBody = request.body;
        console.log(requestBody);
        const requested_foods = mongoClient.db(community_foods_database_name).collection(requested_foods_collection_name);
        const requestFood = await requested_foods.insertOne(requestBody);
        console.log(requestFood);
        response.send(requestFood);
    } catch (error) {
        console.log(error);
    } finally {
        mongoClient.close();
    }
});
clientRequestHandler.post('/addfood', verifyUser, async (request, response) => {
    try {
        await mongoClient.connect();
        const requestBody = request.body;
        console.log(requestBody);
        const donated_foods = mongoClient.db(community_foods_database_name).collection(donated_foods_collection_name);
        const add_food = await donated_foods.insertOne(requestBody);
        console.log(add_food);
        response.send(add_food);
    } catch (error) {
        console.log(error);
    } finally {
        mongoClient.close();
    }
});
clientRequestHandler.patch('/updatefood/:id', verifyUser, async (request, response) => {
    try {
        await mongoClient.connect();
        const id = request.params.id;
        const requestBody = request.body;
        console.log(requestBody);
        const query = { _id: new ObjectId(id) };
        const updates = {
            $set: {
                food_name: requestBody.food_name,
                food_image: requestBody.food_image,
                donator_name: requestBody.donator_name,
                donator_image: requestBody.donator_image,
                donator_email: requestBody.donator_email,
                food_quantity: requestBody.food_quantity,
                pickup_location: requestBody.pickup_location,
                expiry_date: requestBody.expiry_date,
                food_status: requestBody.food_status
            }
        };
        console.log(query, updates);
        const updated_food = mongoClient.db(community_foods_database_name).collection(donated_foods_collection_name);
        const update = await updated_food.updateOne(query, updates);
        console.log(update);
        response.send(update);
    } catch (error) {
        console.log(error);
    } finally {
        mongoClient.close();
    }
});

clientRequestHandler.listen(PORT, () => {
    console.log(`Community Food Sharing Platform Server is running at port ${PORT}`);
})
