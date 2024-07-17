const path = require('path')
const multer= require('multer')

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, path.join(__dirname, '../public/admin-assets/imgs/items'), (err, success) => {
              if (err) {
                throw new err
            }
          });
    },
    filename: function (req, file, cb) {
  
      cb(null, file.originalname);
  }
  });
  
  const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 }, 
    fileFilter: (req, file, cb) => {
     
      cb(null, true); 
    }
  });
  
  module.exports = {upload}