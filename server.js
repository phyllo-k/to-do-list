const express = require("express");
const ejs = require("ejs");
const mongoose = require("mongoose");
const env = process.env.NODE_ENV || "development";
const config = require("./config/" + env + ".js");
const _ = require("lodash");

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));
app.set("view engine", "ejs");

app.on("ready", function () {
    app.listen(process.env.PORT || 3000, function () {
        console.log("Server is running...");
    });
})
config.database.connect("tdlist");
mongoose.connection.once("open", function () {
    app.emit("ready");
});


// Schemas & Models
const itemsSchema = new mongoose.Schema({
    name: String
});
const Item = mongoose.model("Item", itemsSchema);
Item;

const listsSchema = mongoose.Schema({
    name: String,
    items: [itemsSchema]
});
const List = mongoose.model("List", listsSchema);
List;

// Default Items
const defaultItems = [
    new Item({
        name: "Coding for at least 1 hour"
    }),

    new Item({
        name: "Take a Break"
    }),

    new Item({
        name: "Chill"
    })
]

app.get('/', function (req, res) {
    Item.find(function (err, items) {
        if (err) {
            console.log(err);
        } else {
            if (items.length === 0) {
                Item.insertMany(defaultItems, function (err) {
                    if (err) {
                        console.log(err);
                    } else {
                        console.log("Successfully saved default items to DB.");
                        res.redirect("/");
                    }
                })
            } else {
                res.render("list", { listName: "Today", items: items });
            }
        }
    })
})

app.get("/favicon.ico", function (req, res) {
    res.redirect("/");
})

app.get('/:customList/', (req, res) => {
    const customList = _.capitalize(req.params.customList);
    List.findOne({ name: customList }, function (err, result) {
        if (err) {
            console.log(err);
        } else {
            if (!result) {
                const list = new List({
                    name: customList,
                    items: defaultItems
                })
                list.save(function (err) {
                    if (!err) {
                        console.log("Document succesfully created.");
                    }
                });
                res.redirect("/" + customList);
            } else {
                res.render("list", { listName: result.name, items: result.items });
            }
        }
    })

})

app.post("/", function (req, res) {
    const itemName = req.body.newItem;
    const listName = req.body.list;
    if (itemName != "") {
        const item = new Item({
            name: itemName
        });

        if (listName === "Today") {
            item.save();
            res.redirect("/");
        } else {
            List.findOne({ name: listName }, function (err, result) {
                result.items.push(item);
                result.save();
                res.redirect("/" + listName);
            })
        }
    }
})

app.post("/delete", function (req, res) {
    const id = req.body.cb;
    const listName = req.body.list;
    if (listName === "Today") {
        Item.findByIdAndRemove(id, function (err) {
            if (err) {
                console.log(err);
            } else {
                console.log("Successfully deleted checked item from DB.");
                res.redirect("/");
            }
        })
    } else {
        List.findOneAndUpdate({ name: listName }, { $pull: { items: { _id: id } } }, function (err, result) {
            if (err) {
                console.log(err);
            } else {
                console.log("Successfully deleted checked item from DB.");
                res.redirect("/" + listName);
            }
        })
    }
})