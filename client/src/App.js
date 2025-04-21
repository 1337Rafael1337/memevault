import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import Home from './pages/Home';
import UploadImage from './pages/UploadImage';
import MemeEditor from './pages/MemeEditor';
import MemeDetails from './pages/MemeDetails';
import './App.css';

function App() {
    return (
        <Router>
            <div className="App">
                <Header />
                <main className="container">
                    <Routes>
                        <Route path="/" element={<Home />} />
                        <Route path="/upload" element={<UploadImage />} />
                        <Route path="/create/:imageId" element={<MemeEditor />} />
                        <Route path="/meme/:memeId" element={<MemeDetails />} />
                    </Routes>
                </main>
            </div>
        </Router>
    );
}

export default App;