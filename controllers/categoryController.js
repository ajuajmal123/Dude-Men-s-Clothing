const Category = require('../models/categoryModel')

const createCategory = async (req, res) => {
  try {
    const { cat_name, description } = req.body;

    // Validate category name format
    const catRegex = /^(?![-\s]+$)[A-Za-z]+(?:[-\s][A-Za-z]+)*$/;
    if (!catRegex.test(cat_name)) {
      return res.render("new-category", { errmessage: "Invalid category name format!" });
    }

    // Check if category already exists
    const existingCategory = await Category.findOne({ cat_name });
    if (existingCategory) {
      return res.render('new-category', { errmessage: "Category Already Exists!" });
    }

    // Create new category
    await Category.create({ cat_name, description, cat_status: req.body.cat_status });

    // Redirect to category list page
    res.redirect("/admin/category");
  } catch (error) {
    console.error(error);
    res.status(500).render("new-category", { errmessage: "An error occurred while creating the category." });
  }
};


const render_Edit_Category = async (req, res) => {
  const admin = res.locals.admin
  const category = await getcategory(req.params.id).then(
    (category) => category
  );
  res.render("edit-category", { category: category });
};

//get category by id
const getcategory = (cat_id) => {
  return new Promise(async (resolve, reject) => {
    const category = await Category.findById(cat_id);
    resolve(category);
  });
};


const UpdateCategory = async (req, res) => {
  try {
    const { _id, cat_name, cat_status, description } = req.body;

    // Fetch the existing category
    let category = await getcategory(_id);

    if (!category) {
      return res.status(404).json({ error: "Category not found." });
    }

    // Check if the new category name already exists
    const checkCategory = await Category.findOne({ cat_name });

    if (checkCategory && checkCategory._id.toString() !== _id.toString()) {
      // Redirect back to edit if a category with the same name exists
      return res.redirect(`/admin/edit_category/${_id}`);
    }

    // Prepare update data
    const updatedData = { cat_name, cat_status, description };

    // Update category
    await Category.findOneAndUpdate({ _id }, updatedData, { new: true });

    // Redirect to category list page after successful update
    res.redirect("/admin/category");
  } catch (error) {
    // Handle any errors
    console.error(error);
    res.status(500).json({ error: "Internal server error." });
  }
};

//get all categories
const getAllCategories = async () => {
  const categories = await Category.find({ delete: false });
  return categories;
};

const delete_category = async (req, res) => {
  let category = await getcategory(req.params.id).then((category) => category);
  if (category) {
    let id = req.params.id;
    await Category.findOneAndUpdate(
      { _id: id },
      { delete: true, cat_status: false }
    );
    res.redirect("/admin/category");
  }
};


//render category
const render_category_page = async (req, res) => {
  let categories = await getAllCategories();
  categories.map((obj) => {
    obj._doc.createdAt = new Date(obj._doc.createdAt).toLocaleString();
    return obj;
  });
  const admin = res.locals.admin;
  res.render("category", {
    admin: true,
    categories: categories,
    Admin: admin,
  });
};


//render new category form
const render_new_category = (req, res) => {
  const admin = res.locals.admin;
  res.render("new-category", { admin: true, Admin: admin });
};


module.exports = {
  createCategory,
  UpdateCategory,
  getcategory,
  render_category_page,
  render_Edit_Category,
  render_new_category,
  delete_category,
  getAllCategories,
};