const express = require("express");
const router = express.Router();
const User = require("../models/users");
const multer = require("multer");
const fs = require("fs");
const bcrypt = require("bcrypt");
const { body, validationResult } = require("express-validator");

//login form
router.get("/", async (req, res) => {
    if (req.session.user) {
        req.session.msg = null;
        const users = (await User.find()) || [];
        res.render("dashboard", { title: "Admin", users });
    } else {
        res.render("index", { title: "Home" });
    }
});

//signup form
router.get("/signup", (req, res) => {
    res.render("signup", { title: "Register", errors: {}, msg: "" });
});

//image Upload
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "./uploads");
    },
    filename: (req, file, cb) => {
        cb(null, file.fieldname + "_" + Date.now() + "_" + file.originalname);
    },
});

var upload = multer({
    storage: storage,
}).single("image");

//signup
router.post(
    "/signup",
    upload,
    [
        body("name")
            .notEmpty()
            .withMessage("Name is required")
            .isString()
            .withMessage("Name must be a string")
            .isLength({ min: 3 })
            .withMessage("Name must be at least 3 characters long")
            .matches(/^[A-Za-z\s]+$/)
            .withMessage("Name should only contain letters and spaces"),
        body("email").isEmail().withMessage("Enter a valid email"),
        body("password")
            .isLength({ min: 6 })
            .withMessage("Password must be at least 6 characters long"),
        body("phone")
            .notEmpty()
            .withMessage("Phone number is required")
            .isMobilePhone()
            .withMessage("Enter a valid phone number"),
        body("image").custom((value, { req }) => {
            if (!req.file) {
                throw new Error("Image is required");
            }
            const fileExtension = req.file.mimetype.split("/")[1].toLowerCase();
            if (!["jpg", "jpeg", "png"].includes(fileExtension)) {
                throw new Error("Image must be in JPG or PNG format");
            }
            return true;
        }),
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.render("signup", {
                title: "Register",
                msg: "Please fix the errors below.",
                errors: errors.mapped(),
            });
        }

        try {
            const hashedPassword = await bcrypt.hash(req.body.password, 10);
            const user = new User({
                name: req.body.name,
                email: req.body.email,
                password: hashedPassword,
                phone: req.body.phone,
                image: req.file.filename,
            });

            await user.save();

            req.session.message = {
                type: "success",
                message: "Registered successfully",
            };
            res.redirect("/");
        } catch (err) {
            req.session.message = {
                type: "danger",
                message: err.message,
            };
            res.redirect("/signup");
        }
    }
);

//login
router.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        if (!user) {
            req.session.message = {
                type: "danger",
                message: "Email ID not found. Please register or try again.",
            };
            return res.redirect("/");
        }
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            req.session.message = {
                type: "danger",
                message: "Invalid email or password",
            };
            return res.redirect("/");
        }
        req.session.message = {
            type: "success",
            message: "Logged in successfully",
        };
        req.session.user = user.email;
        req.session.name = user.name;
        if (user.isAdmin) {
            res.redirect("/admin");
        } else {
            res.redirect("/user");
        }
    } catch (err) {
        console.error("Login error:", err);
        req.session.message = {
            type: "danger",
            message: "Something went wrong. Please try again.",
        };
        res.redirect("/");
    }
});

//admin dashboard
router.get("/admin", async (req, res) => {
    try {
        if (req.session.user) {
            req.session.msg = null;
            const users = (await User.find()) || [];
            res.render("dashboard", { title: "Admin", users });
        } else {
            return res.redirect("/");
        }
    } catch (err) {
        res.json({ message: err.message });
    }
});

router.get("/user", (req, res) => {
    try {
        if (req.session.user) {
            req.session.msg = null;

            res.render("user_dashboard", {
                title: "Uesr",
                user: req.session.user,
                name: req.session.name,
            });
        } else {
            return res.redirect("/");
        }
    } catch (err) {
        res.json({ message: err.message });
    }
});

//logout
router.get("/logout", (req, res) => {
    req.session.message = {
        type: "info",
        message: "Successfully logged out",
    };

    req.session.destroy((err) => {
        if (err) {
            console.error("Failed to destroy session:", err);
            return res.redirect("/");
        }

        res.redirect("/");
    });
});

//add form
router.get("/add", (req, res) => {
    res.render("add_user", { title: "Add USer", errors: {}, msg: "" });
});

//insert user
router.post(
    "/add",
    upload,
    [
        body("name")
            .notEmpty()
            .withMessage("Name is required")
            .isString()
            .withMessage("Name must be a string")
            .isLength({ min: 3 })
            .withMessage("Name must be at least 3 characters long"),
        body("email").isEmail().withMessage("Enter a valid email"),
        body("password")
            .isLength({ min: 6 })
            .withMessage("Password must be at least 6 characters long"),
        body("phone")
            .notEmpty()
            .withMessage("Phone number is required")
            .isMobilePhone()
            .withMessage("Enter a valid phone number"),
        body("image").custom((value, { req }) => {
            if (!req.file) {
                throw new Error("Image is required");
            }
            const fileExtension = req.file.mimetype.split("/")[1].toLowerCase();
            if (!["jpg", "jpeg", "png"].includes(fileExtension)) {
                throw new Error("Image must be in JPG or PNG format");
            }
            return true;
        }),
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.render("add_user", {
                title: "Add User",
                msg: "Please fix the errors below.",
                errors: errors.mapped(),
            });
        }

        try {
            const hashedPassword = await bcrypt.hash(req.body.password, 10);
            const user = new User({
                name: req.body.name,
                email: req.body.email,
                password: hashedPassword,
                phone: req.body.phone,
                image: req.file.filename,
                isAdmin: req.body.isAdmin === "true",
            });

            await user.save();

            req.session.message = {
                type: "success",
                message: "User created successfully",
            };
            res.redirect("/admin");
        } catch (err) {
            res.json({ message: err.message, type: "danger" });
        }
    }
);

//edit form
router.get("/edit/:id", async (req, res) => {
    try {
        let id = req.params.id;
        const user = await User.findById(id);
        if (user == null) {
            res.redirect("/admin");
        } else {
            res.render("edit_user", { title: "Edit User", user: user });
        }
    } catch (err) {
        res.redirect("/admin");
    }
});

//update code
router.post("/update/:id", upload, async (req, res) => {
    try {
        let id = req.params.id;
        let new_image = "";
        if (req.file) {
            new_image = req.file.filename;
            try {
                fs.unlinkSync("./uploads/" + req.body.old_image);
            } catch (err) {
                console.log("Error deleting old image:", err);
            }
        } else {
            new_image = req.body.old_image;
        }
        const updatedData = {
            name: req.body.name,
            email: req.body.email,
            phone: req.body.phone,
            image: new_image,
            isAdmin: req.body.isAdmin === "true",
        };
        if (req.body.password && req.body.password.trim()) {
            const hashedPassword = await bcrypt.hash(req.body.password, 10);
            updatedData.password = hashedPassword;
        }
        await User.findByIdAndUpdate(id, updatedData);

        req.session.message = {
            type: "success",
            message: "User updated successfully",
        };
        res.redirect("/admin");
    } catch (err) {
        console.error("Update error:", err);
        req.session.message = {
            type: "danger",
            message: "Failed to update user",
        };
        res.redirect("/edit/" + req.params.id);
    }
});

//delete
router.delete("/delete/:id", async (req, res) => {
    const id = req.params.id;
    try {
        const user = await User.findByIdAndDelete(id);
        if (user) {
            if (user.image) {
                try {
                    fs.unlinkSync("./uploads/" + user.image);
                } catch (err) {
                    console.error("Error deleting image:", err);
                }
            }

            req.session.message = {
                type: "info",
                message: "User deleted successfully",
            };
            res.redirect("/admin");
        } else {
            req.session.message = {
                type: "danger",
                message: "User not found",
            };
            res.redirect("/admin");
        }
    } catch (err) {
        console.error("Deletion error:", err);
        req.session.message = {
            type: "danger",
            message: "Error deleting user",
        };
        res.redirect("/admin");
    }
});

module.exports = router;
