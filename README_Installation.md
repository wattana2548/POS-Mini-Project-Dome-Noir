# Installation Guide (ขั้นตอนการติดตั้งระบบ) - Dome Noir Cafe POS

ระบบจัดการร้านกาแฟ Dome Noir พัฒนาด้วย Node.js, Express และ MongoDB (Mongoose)

## 📋 ความต้องการของระบบ (Prerequisites)
- [Node.js](https://nodejs.org/) (แนะนำเวอร์ชัน 16.x ขึ้นไป)
- [MongoDB](https://www.mongodb.com/try/download/community) (ติดตั้งเป็น Local Service หรือใช้ MongoDB Atlas)

## 🚀 ขั้นตอนการติดตั้ง (Installation Steps)

1. **แตกไฟล์โปรเจกต์** และเปิด Terminal/Command Prompt ในโฟลเดอร์โปรเจกต์
2. **ติดตั้ง Dependencies**
   ```bash
   npm install
   ```
3. **ตรวจสอบการเชื่อมต่อฐานข้อมูล**
   - ไปที่ไฟล์ `config/db.js`
   - ตรวจสอบบรรทัด `mongoose.connect("mongodb://127.0.0.1:27017/CafePOS")` ว่าตรงกับเครื่องของคุณหรือไม่
4. **สร้างบัญชี Admin เริ่มต้น** (สำคัญมาก)
   - รันสคริปต์เพื่อสร้าง User สำหรับทดสอบระบบ:
   ```bash
   node generateAdmin.js
   ```
   - **User สำหรับเข้าใช้ครั้งแรก:**
     - **Email:** admin@cafe.com
     - **Password:** 123456

## 🖥️ วิธีเข้าใช้งานระบบ (Running the Project)

1. **เริ่มรันระบบ**
   ```bash
   npm start
   ```
2. **เปิดเบราว์เซอร์** และไปที่:
   [http://localhost:8080](http://localhost:8080)
3. **เข้าสู่ระบบ** ด้วย Email และ Password ที่สร้างไว้จากขั้นตอนก่อนหน้า

---

## 📂 โครงสร้างโปรเจกต์ที่สำคัญ
- `models/`: นิยามโครงสร้างข้อมูล (Schema) เช่น Member, Customer, Product, Sale
- `controllers/`: ส่วนควบคุมตรรกะการทำงาน (Logic) ของระบบ
- `views/`: ส่วนการแสดงผล (UI) ใช้ EJS Template
- `public/`: เก็บไฟล์ Static เช่น CSS, Images, JS
- `routes/`: กำหนดเส้นทาง (URL Path) ของแต่ละเมนู
