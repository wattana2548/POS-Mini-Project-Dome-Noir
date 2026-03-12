module.exports = (req,res,next)=>{

    // ยังไม่ login
    if(!req.session.user){
        return res.redirect('/login');
    }

    // ไม่ใช่ admin
    if(req.session.user.role !== 'admin'){
        return res.redirect('/');
    }

    next();
}