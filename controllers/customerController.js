const Customer = require("../models/customers");

/* ======================
   SHOW CUSTOMERS
====================== */

exports.manageCustomers = async (req, res) => {

    const search = req.query.search || "";

    const customers = await Customer.find({
        $or: [
            { name: { $regex: search, $options: "i" } },
            { phone: { $regex: search, $options: "i" } }
        ]
    });

    res.render('customers/manageCustomers', {
        customers,
        search
    });

};


/* ======================
   ADD CUSTOMER
====================== */

exports.showAddCustomer = (req,res)=>{

    res.render("customers/add",{
        title:"Add Customer"
    });

};


exports.addCustomer = async (req,res)=>{

    const { name, phone } = req.body;

    await new Customer({
        name,
        phone
    }).save();

    res.redirect("/customers/manageCustomers");

};


/* ======================
   EDIT
====================== */

exports.showEditCustomer = async (req,res)=>{

    const customer = await Customer.findById(req.params.id);

    res.render("customers/edit",{
        customer,
        title:"Edit Customer"
    });

};


exports.updateCustomer = async (req,res)=>{

    const { id, name, phone } = req.body;

    await Customer.findByIdAndUpdate(id,{
        name,
        phone
    });

    res.redirect("/customers/manageCustomers");

};


/* ======================
   DELETE
====================== */

exports.deleteCustomer = async (req,res)=>{

    await Customer.findByIdAndDelete(req.params.id);

    res.redirect("/customers/manageCustomers");

};