const Product = require("../models/productModel");
const Category = require("../models/categoryModel");
const { getAllCategories } = require("./categoryController");
const mongoose = require("mongoose");
const { json } = require('body-parser');
const sharp = require('sharp');
const path = require("path");

/* const add_product = async (req, res) => {
    try {
        // Additional validation for numerical fields
        const stock = parseInt(req.body.stock);
        const prod_price = parseFloat(req.body.prod_price);
        const sellig_price = parseFloat(req.body.sellig_price);
        
        if (
            isNaN(stock) ||
            isNaN(prod_price) ||
            isNaN(sellig_price) ||
            stock <= 0 ||
            prod_price <= 0 ||
            sellig_price <= 0
        ) {
            return res
                .status(400)
                .json({
                    error:
                        "Stock, Actual Price, and Selling Price must be numerical and greater than 0.",
                });
        }
        //validation for size
        const size=parseInt(req.body.size)
        if(size<=0){
            return res 
            .status(400)
            .json({
                error:
                "Size should be in positive value"
            })
        }

        // Validate the number of images uploaded
        if (!req.files || req.files.length < 2) {
            return res
                .status(400)
                .json({ error: "At least 2 secondary images are required." });
        }
        let PrimaryImage;
        let seconaryImages = [];
        req.files.forEach((e) => {

            if (e.fieldname === 'primary-image') {
                PrimaryImage = {
                    name: e.filename,
                    path: e.path,
                };
            }
            else {
                let image = {
                    name: e.filename,
                    path: e.path
                }
                seconaryImages.push(image);
            }
        });

        const product = new Product({
            product_name: req.body.product_name,
            brand_name: req.body.brand_name,
            description: req.body.description,
            category_id: req.body.category,
            stock: req.body.stock,
            actual_price: req.body.prod_price,
            selling_price: req.body.sellig_price,
            color: req.body.color,
            size: req.body.size,
            primary_image: PrimaryImage,
            secondary_images: seconaryImages,
        });

        await product.save();


        res.redirect("/admin/product");
    } catch (error) {
        res.status(400).send(error);
    }
}; */

const add_product = async (req, res) => {
    try {
        let sizes;
        try {
            sizes = JSON.parse(req.body.sizes);
        } catch (error) {
            console.error("JSON Parsing Error:", error.message);
            return res.status(400).json({ error: "Invalid sizes format." });
        }

        // Validate sizes
        for (const sizeObj of sizes) {
            if (typeof sizeObj !== 'object' || !sizeObj.size || !sizeObj.stock) {
                return res.status(400).json({ error: "Invalid sizes format. Each size must include 'size' and 'stock'." });
            }
            const stock = parseInt(sizeObj.stock, 10);
            if (isNaN(stock) || stock <= 0) {
                return res.status(400).json({ error: "Stock should be a positive number." });
            }
        }

        // Validate number of images
        if (!req.files || req.files.length < 2) {
            return res.status(400).json({ error: "At least 2 secondary images are required." });
        }

        let PrimaryImage;
        let secondaryImages = [];
        req.files.forEach((e) => {
            if (e.fieldname === 'primary-image') {
                PrimaryImage = {
                    name: e.filename,
                    path: e.path,
                };
            } else {
                secondaryImages.push({
                    name: e.filename,
                    path: e.path,
                });
            }
        });

        const product = new Product({
            product_name: req.body.product_name,
            brand_name: req.body.brand_name,
            description: req.body.description,
            category_id: req.body.category,
            sizes: sizes,
            actual_price: req.body.prod_price,
            selling_price: req.body.sellig_price,
            color: req.body.color,
            primary_image: PrimaryImage,
            secondary_images: secondaryImages,
        });

        await product.save();
        res.redirect("/admin/product");
    } catch (error) {
        console.error("Error saving product:", error.message);
        res.status(400).json({ error: "There was an error processing your request." });
    }
};

//render Product
const render_product_page = async (req, res) => {
    const admin = res.locals.admin;
    const currentPage = parseInt(req.query.page) || 1;
    const perPage = 4; // Number of products per page
    try {
        const totalProducts = await Product.countDocuments({ delete: false });
        const totalPages = Math.ceil(totalProducts / perPage);
        const skip = (currentPage - 1) * perPage;

        const products = await getAllProducts(skip, perPage);

        res.render("product", {
            Admin: admin,
            products: products,
            success: req.flash("success")[0],
            error: req.flash("false")[0],
            totalPages: totalPages,
            currentPage: currentPage,
            itemsPerPage: perPage,
        });
    } catch (error) {
        console.error("Error rendering product page:", error);
        res.status(500).send("Internal Server Error");
    }
};

//get all Product
const getAllProducts = async (skip, perPage) => {
    const products = await Product.aggregate([
        {
            $match: {
                delete: false,
                
            },
        },
        {
            $lookup: {
                from: "categories",
                localField: "category_id",
                foreignField: "_id",
                as: "category",
            },
        },
        {
            $unwind: "$category",
        },
        {
            $match: {
                "category.cat_status": true,
                "category.delete": false,
            },
        },
        {
            $project: {
                _id: 1,
                product_name: 1,
                brand_name: 1,
                stock: 1,
                primary_image: 1,
                "category.cat_name": 1,
                actual_price: 1,
                selling_price: 1,
                color: 1,
                sizes: 1,
                status: 1,
                description: 1,
            },
        },
        {
            $skip: skip,
        },
        {
            $limit: perPage,
        },
    ]);
    return products;
};

//render new product form
const render_new_product = async (req, res) => {
    const admin = res.locals.admin;
    const category = await getAllCategories();
    res.render("new-product", {
        fullscreen: true,
        Admin: admin,
        category: category,
    });
};

//find Product Function
const findProduct = async (product_id) => {
    const product = await Product.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(product_id),
                delete:false
                //status:true
            },
        },
        {
            $lookup: {
                from: "categories",
                localField: "category_id",
                foreignField: "_id",
                as: "category",
            },
        },
        {
            $unwind: "$category",
        },
        {
            $match: {
                "category.cat_status": true,
                "category.delete": false,
            },
        },
        {
            $project: {
                _id: 1,
                product_name: 1,
                brand_name: 1,
                stock: 1,
                primary_image: 1,
                "category.cat_name": 1,
                "category._id": 1,
                selling_price: 1,
                actual_price: 1,
                color: 1,
                sizes: 1,
                status: 1,
                description: 1,
                GST: 1,
                primary_image: 1,
                secondary_images: 1,
            },
        },
    ]);
    return product;
};

const getCategory = async (name) => {
    const categories = await Category.find({ cat_name: { $ne: name }});
    return categories;
};

//reneder edit product page
const render_edit_product = async (req, res) => {
    const product = await findProduct(req.params.id);
    const obj = product[0];
    const category = await getCategory(obj.category.cat_name);
    res.render("edit-product", { admin: true, obj, category: category });
};


const update_product = async (req, res) => {
    try {
           
            const { sizes, stocks,product_name,
                brand_name,
                description, prod_price,
                sellig_price,
                color, status,
                imagesToDelete} = req.body;
                  // Parse imagesToDelete
        let imagesToDeleteParsed = [];
        try {
            if (imagesToDelete) {
                imagesToDeleteParsed = JSON.parse(imagesToDelete);
            }
        } catch (error) {
            console.log('Error parsing imagesToDelete:', error);
        }

        // Server-side validation
        if (prod_price <= 0 || sellig_price <= 0 || stock <= 0) {
            req.flash("error", "Prices and stock must be greater than 0.");
            return res.redirect(`/admin/edit-product/${req.body.id}`);
        }

        if (req.files != null) {
            const allowedImageTypes = ['jpeg', 'image/png', 'image/webp', 'image/svg+xml'];

            // Validate primary image
            let primaryImage = req.files.primaryImage;
            if (primaryImage && !allowedImageTypes.includes(primaryImage.mimetype)) {
                req.flash("error", "Invalid primary image file type. Only JPG, PNG, WEBP, and SVG are allowed.");
                return res.redirect(`/admin/edit-product/${req.body.id}`);
            }

            // Validate secondary images
            let secondaryImages = req.files.images;
            if (secondaryImages) {
                for (let i = 0; i < secondaryImages.length; i++) {
                    if (!allowedImageTypes.includes(secondaryImages[i].mimetype)) {
                        req.flash("error", "Invalid secondary image file type. Only JPG, PNG, WEBP, and SVG are allowed.");
                        return res.redirect(`/admin/edit-product/${req.body.id}`);
                    }
                }
            }
        }
                const sizeStockPairs = sizes.map((size, index) => {
                    const stock = parseInt(stocks[index], 10);
                    if (isNaN(stock) || stock <= 0 || isNaN(size) || size <= 0) {
                        req.flash("error", "Size and stock must be greater than 0.");
                        return null;
                    }
                    return { size: parseInt(size, 10), stock };
                });
        
                if (sizeStockPairs.includes(null)) {
                    return res.redirect(`/admin/edit-product/${req.body.id}`);
                }
        


        //const product = await Product.findOne({ _id: req.body.id });
        if (req.files != null) {
            // Handle primary image update
            let primaryImage = req.files.primaryImage;

            if (primaryImage) {
                product.primary_image.name = primaryImage[0].filename;
                product.primary_image.path = primaryImage[0].path;
                await sharp(
                    path.join(
                        __dirname +
                        `/../public/admin-assets/imgs/items/${product.primary_image.name}`
                    )
                )
                    .resize(480, 480)
                    .toFile(
                        path.join(
                            __dirname +
                            `/../public/uploads/products/${product.primary_image.name}`
                        )
                    );
            }

            // Handle secondary image update
            let secondaryImages = req.files.images;
            if (secondaryImages) {
                for (let i = 0; i < secondaryImages.length; i++) {
                    product.secondary_images[i].name = secondaryImages[i].filename;
                    product.secondary_images[i].path = secondaryImages[i].path;
                }

                secondaryImages.forEach(async (image) => {
                    await sharp(
                        path.join(
                            __dirname + `/../public/admin-assets/imgs/items/${image.filename}`
                        )
                    )
                        .resize(480, 480)
                        .toFile(
                            path.join(
                                __dirname + `/../public/uploads/products/${image.filename}`
                            )
                        );
                });
            }
        }

        // Handle image deletions
        imagesToDeleteParsed.forEach(async (image) => {
            if (image.type === 'primary_img') {
                fs.unlinkSync(product.primary_image.path);
                product.primary_image = null;
            } else if (image.type === 'secondary_img') {
                const imgIndex = product.secondary_images.findIndex(img => img._id.toString() === image.id);
                if (imgIndex !== -1) {
                    fs.unlinkSync(product.secondary_images[imgIndex].path);
                    product.secondary_images.splice(imgIndex, 1);
                }
            }

        });
        const updatedProduct = {
            stocks,product_name,
            brand_name,
            description, prod_price,
            sellig_price,
            color, status,
            imagesToDelete ,
            sizes: sizeStockPairs
        };

        
        await Product.findByIdAndUpdate({ _id: req.body.id }, updatedProduct);
        req.flash("success", "Product updated successfully");
        res.redirect("/admin/product");
    } catch (err) {
        console.log(err);
    }
};


//delete product
const deleteProduct = async (req, res) => {


    await Product.findByIdAndUpdate({ _id: req.params.id }, { delete: true });

    res.redirect("/admin/product");
};


module.exports = {
    render_product_page,
    render_new_product,
    add_product,
    render_edit_product,
    update_product,
    deleteProduct,
};

