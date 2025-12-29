/******************************************************************************
***
* ITE5315 – Assignment 2
* I declare that this assignment is my own work in accordance with Humber Academic Policy.
* No part of this assignment has been copied manually or electronically from any other source
* (including web sites) or distributed to other students.
*
* Name: Divjit  Student ID: N01719434
*
******************************************************************************/

// ===== MODULES =====
const express = require("express");
const path = require("path");
const fs = require("fs");
const { body, validationResult } = require("express-validator");
const exphbs = require("express-handlebars");

const app = express();

// ===== MIDDLEWARE =====
app.use(express.static(path.join(process.cwd(), "public")));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// ===== HANDLEBARS =====
app.engine(
  "hbs",
  exphbs({
    extname: ".hbs",
    partialDir: path.join(process.cwd(), "views", "partials"),
    helpers: {
      displayName: function (name) {
        return name && name.trim() !== "" ? name : "N/A";
      },
      highlightIfEmpty: function (name) {
        return name && name.trim() !== "" ? "" : "background-color: #ffe6e6;";
      }
    }
  })
);

app.set("view engine", "hbs");
app.set("views", path.join(process.cwd(), "views"));

// ===== LOAD JSON DATA (ASYNC + VERCEL SAFE) =====
let airbnbData = [];

async function loadData() {
  try {
    const filePath = path.join(process.cwd(), "data", "airbnb_small.json");
    const raw = await fs.promises.readFile(filePath, "utf8");
    const json = JSON.parse(raw);

    // Normalize keys
    const normalized = json.map(item => ({
      id: item.id,
      name: item.NAME,
      host_id: item["host id"],
      host_name: item["host name"],
      neighbourhood_group: item["neighbourhood group"],
      neighbourhood: item.neighbourhood,
      lat: item.lat,
      long: item.long,
      country: item.country,
      country_code: item["country code"],
      room_type: item["room type"],
      construction_year: item["Construction year"],
      price: item.price,
      service_fee: item["service fee"],
      minimum_nights: item["minimum nights"],
      number_of_reviews: item["number of reviews"],
      last_review: item["last review"],
      reviews_per_month: item["reviews per month"],
      review_rate_number: item["review rate number"],
      availability_365: item["availability 365"],
      house_rules: item.house_rules,
      license: item.license,
      property_type: item.property_type,
      thumbnail: item.thumbnail,
      images: item.images,
      cancellation_policy: item.cancellation_policy
    }));

    console.log("Loaded dataset:", normalized.length, "records");
    return normalized;
  } catch (err) {
    console.error("JSON load error:", err);
    return [];
  }
}

// Load once on cold start (Vercel behavior)
// NOTE: For local dev, we load before listen. For Vercel, this might still be needed if it exports app without listening.
if (process.env.VERCEL) {
  loadData().then(data => {
    airbnbData = data;
  });
}

// ===== ROUTES =====

// Home
app.get("/", (req, res) => {
  res.render("index", { title: "Express" });
});

// Users
app.get("/users", (req, res) => {
  res.render("users", { title: "Users" });
});

// About (Resume embed)
app.get("/about", (req, res) => {
  const filePath = path.join(process.cwd(), "public", "html", "Resume.html");
  const resumeHtml = fs.readFileSync(filePath, "utf8");
  res.render("about", { title: "About Me", resumeContent: resumeHtml });
});

// ===== SEARCH BY ID =====
app.get("/search/id", (req, res) => {
  res.render("searchByID", { title: "Search by Property ID" });
});

app.post(
  "/search/id",
  body("propertyId").notEmpty().withMessage("Property ID is required").trim().escape(),
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.render("searchByID", { title: "Search by Property ID", errors: errors.array() });
    }

    const id = req.body.propertyId;
    const record = airbnbData.find(i => String(i.id) === id);

    if (!record) {
      return res.render("searchByID", { title: "Search by Property ID", notFound: true });
    }

    res.render("propertyDetails", { title: `Property ID ${id}`, record });
  }
);

// ===== SEARCH BY NAME =====
app.get("/search/name", (req, res) => {
  res.render("searchByName", { title: "Search by Property Name" });
});

app.post(
  "/search/name",
  body("propertyName").notEmpty().withMessage("Property Name is required").trim().escape(),
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.render("searchByName", { title: "Search by Property Name", errors: errors.array() });
    }

    const search = req.body.propertyName.toLowerCase();
    const results = airbnbData.filter(
      i => i.name && i.name.toLowerCase().includes(search)
    );

    res.render("searchByName", { title: `Results for "${req.body.propertyName}"`, results });
  }
);

// ===== STEP 8 – VIEW DATA =====
app.get("/viewData", (req, res) => {
  console.log("Accessing /viewData. Records available:", airbnbData.length);
  res.render("viewData", {
    title: "View All Airbnb Data",
    records: airbnbData.slice(0, 100) // VERCEL SAFE
  });
});

// ===== STEP 9 – CLEAN VIEW =====
app.get("/viewData/clean", (req, res) => {
  res.render("viewDataClean", {
    title: "View Clean Airbnb Data",
    records: airbnbData.slice(0, 100)
  });
});

// ===== STEP 11 – PRICE SEARCH =====
app.get("/viewData/price", (req, res) => {
  res.render("viewDataPrice", { title: "Search by Price Range" });
});

app.post(
  "/viewData/price",
  body("minPrice").notEmpty().isNumeric().withMessage("Minimum price must be numeric"),
  body("maxPrice").notEmpty().isNumeric().withMessage("Maximum price must be numeric"),
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.render("viewDataPrice", { title: "Search by Price Range", errors: errors.array() });
    }

    const min = Number(req.body.minPrice);
    const max = Number(req.body.maxPrice);

    const filtered = airbnbData.filter(item => {
      if (!item.price) return false;
      const p = Number(String(item.price).replace(/[^0-9.-]/g, ""));
      return p >= min && p <= max;
    });

    res.render("viewDataPrice", {
      title: `Properties between $${min} and $${max}`,
      results: filtered
    });
  }
);

// ===== 404 =====
app.get("*", (req, res) => {
  res.render("error", { title: "Error", message: "Wrong Route" });
});

// ===== EXPORT FOR VERCEL =====
module.exports = app;

// ===== LOCAL SERVER =====
if (require.main === module) {
  const PORT = process.env.PORT || 3000;

  // Wait for data to load before starting server
  loadData().then(data => {
    airbnbData = data;
    app.listen(PORT, () => {
      console.log(`Server is running on http://localhost:${PORT}`);
      console.log(`Data loaded successfully: ${airbnbData.length} records`);
    });
  }).catch(err => {
    console.error("Failed to load data on startup:", err);
  });
}
