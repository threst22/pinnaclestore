import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, ShoppingCart, User, LogOut, PlusCircle, Edit, Trash2, Upload, DollarSign, Download, Users, Package, MinusCircle, Trash, CheckCircle, XCircle, Bell, Settings, Award, TrendingUp, ArrowLeft, ShieldAlert } from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { 
    getAuth, 
    onAuthStateChanged, 
    signOut,
    signInWithCustomToken,
    signInAnonymously
} from 'firebase/auth';
import { 
    getFirestore, 
    doc, 
    getDoc, 
    updateDoc, 
    collection, 
    query, 
    onSnapshot, 
    addDoc,
    deleteDoc,
    writeBatch,
    where,
    getDocs,
    setDoc
} from 'firebase/firestore';

// --- Firebase Configuration & App ID ---
// These will be provided by the environment. For Netlify, use Environment Variables.
const isBrowser = typeof window !== 'undefined';

const firebaseConfig = isBrowser && window.__firebase_config
  ? JSON.parse(window.__firebase_config)
  : (process.env.REACT_APP_FIREBASE_CONFIG ? JSON.parse(process.env.REACT_APP_FIREBASE_CONFIG) : {});

const appId = (isBrowser && window.__app_id) || process.env.REACT_APP_APP_ID || 'pinnpoints-store-default';

const initialAuthToken = (isBrowser && window.__initial_auth_token) || process.env.REACT_APP_INITIAL_AUTH_TOKEN || null;


// --- Firestore Collection Paths ---
const collections = {
    users: `/artifacts/${appId}/public/data/users`,
    inventory: `/artifacts/${appId}/public/data/inventory`,
    pendingOrders: `/artifacts/${appId}/public/data/pendingOrders`,
    purchaseHistory: `/artifacts/${appId}/public/data/purchaseHistory`,
    appSettings: `/artifacts/${appId}/public/data/appSettings`
};

const themes = {
  shopee: { name: 'Shopee Orange', primary: '#ee4d2d', light: '#fff4f2', dark: '#d73112' },
  indigo: { name: 'Default Indigo', primary: '#4f46e5', light: '#e0e7ff', dark: '#3730a3' },
  sky: { name: 'Sky Blue', primary: '#0ea5e9', light: '#e0f2fe', dark: '#0369a1' },
  emerald: { name: 'Emerald Green', primary: '#10b981', light: '#d1fae5', dark: '#047857' },
  rose: { name: 'Rose Pink', primary: '#f43f5e', light: '#ffe4e6', dark: '#be123c' },
  amber: { name: 'Amber Orange', primary: '#f59e0b', light: '#fef3c7', dark: '#b45309' },
};

// --- Helper to load external scripts ---
const loadScript = (src, id) => {
    if (document.getElementById(id)) return;
    const script = document.createElement('script');
    script.src = src;
    script.id = id;
    script.async = true;
    document.head.appendChild(script);
};

// --- MAIN APP COMPONENT ---
export default function App() {
    const [currentUser, setCurrentUser] = useState(null);
    const [currentUserData, setCurrentUserData] = useState(null);
    const [view, setView] = useState('loading');
    const [users, setUsers] = useState({});
    const [inventory, setInventory] = useState([]);
    const [pendingOrders, setPendingOrders] = useState([]);
    const [purchaseHistory, setPurchaseHistory] = useState([]);
    const [notification, setNotification] = useState({ show: false, message: '', type: 'success' });
    const [cart, setCart] = useState([]);
    const [firebaseServices, setFirebaseServices] = useState(null);
    const [isAuthReady, setIsAuthReady] = useState(false);
    const [modal, setModal] = useState({ isOpen: false, title: '', message: '', onConfirm: () => {} });
    const [errorDetails, setErrorDetails] = useState('');

    const [appSettings, setAppSettings] = useState({
        logo: 'https://img.icons8.com/plasticine/100/like-us.png',
        theme: 'shopee',
        inflation: 0,
    });

    // --- Initialize Firebase ---
    useEffect(() => {
        if (!firebaseConfig || !firebaseConfig.apiKey) {
            console.error("Firebase Configuration is missing or invalid.");
            setErrorDetails("Firebase configuration is missing. Ensure REACT_APP_FIREBASE_CONFIG is set in your environment.");
            setView('error');
            return;
        }
        try {
            const app = initializeApp(firebaseConfig);
            const auth = getAuth(app);
            const db = getFirestore(app);
            setFirebaseServices({ app, auth, db });
            loadScript('https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js', 'xlsx-script');
        } catch (error) {
            console.error("Firebase Initialization Error:", error);
            setErrorDetails(`Firebase Initialization Error: ${error.message}`);
            setView('error');
        }
    }, []);

    // --- Authentication Listener ---
    useEffect(() => {
        if (!firebaseServices) return;
        const { auth } = firebaseServices;

        const unsubscribe = onAuthStateChanged(auth, user => {
            if (user) {
                setCurrentUser(user);
            } else {
                (async () => {
                    try {
                        if (initialAuthToken) {
                            await signInWithCustomToken(auth, initialAuthToken);
                        } else {
                            await signInAnonymously(auth);
                        }
                    } catch (error) {
                        console.error("Sign-in error:", error);
                        setErrorDetails(`Authentication failed: ${error.message}. Please check your Firebase Authentication settings (Anonymous sign-in may be disabled).`);
                        setView('error');
                    }
                })();
            }
            setIsAuthReady(true);
        });
        return () => unsubscribe();
    }, [firebaseServices]);

    // --- Data Fetching and App Logic Setup ---
    useEffect(() => {
        if (!isAuthReady || !currentUser || !firebaseServices) return;

        const { db } = firebaseServices;
        const userDocRef = doc(db, collections.users, currentUser.uid);

        const setupListeners = (userData) => {
            const unsubscribers = [];
            unsubscribers.push(onSnapshot(query(collection(db, collections.users)), snapshot => {
                const usersData = {};
                snapshot.forEach(doc => usersData[doc.id] = { ...doc.data(), uid: doc.id });
                setUsers(usersData);
            }));
            unsubscribers.push(onSnapshot(query(collection(db, collections.inventory)), snapshot => {
                const inventoryData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setInventory(inventoryData);
            }));
            unsubscribers.push(onSnapshot(query(collection(db, collections.pendingOrders)), snapshot => {
                const ordersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setPendingOrders(ordersData);
            }));
            unsubscribers.push(onSnapshot(query(collection(db, collections.purchaseHistory)), snapshot => {
                const historyData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setPurchaseHistory(historyData);
            }));
            unsubscribers.push(onSnapshot(userDocRef, (docSnap) => {
                 if(docSnap.exists()){
                     setCurrentUserData({ uid: currentUser.uid, email: currentUser.email, ...docSnap.data() });
                 }
            }));

            setView(userData.role === 'admin' ? 'admin' : 'store');
            return unsubscribers;
        };

        let activeListeners = [];

        getDoc(userDocRef).then(async (userDocSnap) => {
            if (userDocSnap.exists()) {
                const userData = { uid: currentUser.uid, email: currentUser.email, ...userDocSnap.data() };
                setCurrentUserData(userData);
                activeListeners = setupListeners(userData);
            } else {
                const usersCollectionRef = collection(db, collections.users);
                const allUsersSnapshot = await getDocs(query(usersCollectionRef));
                const isFirstUser = allUsersSnapshot.empty;
                const role = isFirstUser ? 'admin' : 'employee';
                const name = currentUser.email ? currentUser.email.split('@')[0] : `User-${currentUser.uid.substring(0,5)}`;
                const newUserData = {
                    uid: currentUser.uid,
                    email: currentUser.email || `${currentUser.uid.substring(0, 5)}@anonymous.com`,
                    name: name,
                    points: role === 'admin' ? 9999 : 500,
                    role: role,
                    notifications: [],
                };
                await setDoc(userDocRef, newUserData);
                setCurrentUserData(newUserData);
                activeListeners = setupListeners(newUserData);
            }
        }).catch(error => {
            console.error("Error fetching or creating user data:", error);
            setErrorDetails(`Database access failed: ${error.message}. Please check your Firestore security rules to ensure authenticated users can read/write their own profile.`);
            setView('error');
        });

        const settingsDocRef = doc(db, collections.appSettings, 'config');
        const settingsUnsub = onSnapshot(settingsDocRef, (doc) => {
            if (doc.exists()) {
                setAppSettings(prev => ({...prev, ...doc.data()}));
            }
        });
        
        return () => {
            activeListeners.forEach(unsub => unsub());
            settingsUnsub();
        };

    }, [isAuthReady, currentUser, firebaseServices]);
    
    const showModal = (title, message, onConfirm) => {
        setModal({ isOpen: true, title, message, onConfirm: () => {
            onConfirm();
            setModal({ isOpen: false, title: '', message: '', onConfirm: () => {} });
        }});
    };
    
    const closeModal = () => {
        setModal({ isOpen: false, title: '', message: '', onConfirm: () => {} });
    };

    const appStyles = `
        :root {
            --color-primary: ${themes[appSettings.theme]?.primary || '#ee4d2d'};
            --color-primary-light: ${themes[appSettings.theme]?.light || '#fff4f2'};
            --color-primary-dark: ${themes[appSettings.theme]?.dark || '#d73112'};
        }
    `;

    const showNotification = useCallback((message, type = 'success', duration = 3000) => {
        setNotification({ show: true, message, type });
        setTimeout(() => {
            setNotification({ show: false, message: '', type: 'success' });
        }, duration);
    }, []);

    const addNotification = useCallback(async (userId, message, type) => {
        const { db } = firebaseServices;
        const newNotification = {
            id: Date.now(),
            message,
            type,
            timestamp: new Date().toISOString(),
            read: false
        };
        try {
            const userRef = doc(db, collections.users, userId);
            const userSnap = await getDoc(userRef);
            if (userSnap.exists()) {
                const userData = userSnap.data();
                const currentNotifications = userData.notifications || [];
                const newNotifications = [newNotification, ...currentNotifications].slice(0, 20);
                await updateDoc(userRef, { notifications: newNotifications });
            }
        } catch (error) {
            console.error("Error adding notification:", error);
        }
    }, [firebaseServices]);

    const handleLogout = async () => {
        if (!firebaseServices) return;
        const { auth } = firebaseServices;
        try {
            await signOut(auth);
            setCart([]);
            setCurrentUser(null);
            setCurrentUserData(null);
            setView('loading');
        } catch (error) {
            showNotification(error.message, 'error');
        }
    };

    const executePurchase = useCallback(async (employeeId, purchaseCart, isApproval = false) => {
        const { db } = firebaseServices;
        const employee = users[employeeId];
        if (!employee) return { success: false, message: "Employee not found." };

        const totalCost = purchaseCart.reduce((sum, item) => sum + (item.points * item.quantity), 0);

        if (employee.points >= totalCost) {
            const batch = writeBatch(db);
            const userRef = doc(db, collections.users, employeeId);
            batch.update(userRef, { points: employee.points - totalCost });

            for (const cartItem of purchaseCart) {
                const itemRef = doc(db, collections.inventory, cartItem.id);
                const itemSnap = await getDoc(itemRef);
                if (itemSnap.exists()) {
                    const currentStock = itemSnap.data().stock;
                    if(currentStock < cartItem.quantity){
                       return { success: false, message: `Not enough stock for ${cartItem.name}.` };
                    }
                    batch.update(itemRef, { stock: currentStock - cartItem.quantity });
                }
            }
            
            const historyRef = collection(db, collections.purchaseHistory);
            batch.set(doc(historyRef), {
                employeeId,
                employeeName: employee.name,
                cart: purchaseCart,
                totalCost,
                timestamp: new Date().toISOString()
            });

            try {
                await batch.commit();
                if (isApproval) {
                    const purchasedItems = purchaseCart.map(item => `${item.name} (x${item.quantity})`).join(', ');
                    await addNotification(employeeId, `Your purchase request for ${purchasedItems} has been approved.`, 'success');
                }
                return { success: true };
            } catch (error) {
                console.error("Purchase execution error:", error);
                return { success: false, message: "Failed to complete purchase." };
            }
        }
        return { success: false, message: "Insufficient points." };
    }, [firebaseServices, users, addNotification]);

    const handlePurchaseRequest = async (purchaseCart) => {
        const { db } = firebaseServices;
        try {
            await addDoc(collection(db, collections.pendingOrders), {
                employeeId: currentUser.uid,
                cart: purchaseCart,
                status: 'pending',
                timestamp: new Date().toISOString()
            });
            showNotification(`Purchase request sent for admin approval.`, 'success');
            setCart([]);
            setView('store');
        } catch (error) {
            showNotification(error.message, 'error');
        }
    };

    const handleUpdateCartQuantity = (itemId, newQuantity) => {
        const item = inventory.find(i => i.id === itemId);
        if (newQuantity <= 0) {
            setCart(cart.filter(cartItem => cartItem.id !== itemId));
        } else if (item && item.stock >= newQuantity) {
            setCart(cart.map(cartItem => cartItem.id === itemId ? { ...cartItem, quantity: newQuantity } : cartItem));
        } else if (item) {
            showNotification(`Only ${item.stock} of ${item.name} available.`, 'warning');
            setCart(cart.map(cartItem => cartItem.id === itemId ? { ...cartItem, quantity: item.stock } : cartItem));
        }
    };
    
    const handleSaveAppSettings = async (newSettings) => {
        const { db } = firebaseServices;
        try {
            const settingsDocRef = doc(db, collections.appSettings, 'config');
            await setDoc(settingsDocRef, newSettings, { merge: true });
            showNotification('Settings saved successfully.', 'success');
        } catch (error) {
            showNotification('Failed to save settings.', 'error');
            console.error("Error saving settings: ", error);
        }
    };


    const renderContent = () => {
        if (view === 'error') return <ErrorPage message="A critical error occurred." details={errorDetails} />;
        if (view === 'loading' || !currentUserData) return <div className="flex items-center justify-center min-h-screen text-lg font-semibold">Loading Application...</div>;
        
        switch (view) {
            case 'cart':
                return <CartPage
                    cart={cart}
                    onUpdateQuantity={handleUpdateCartQuantity}
                    onConfirmPurchase={() => handlePurchaseRequest(cart)}
                    userPoints={currentUserData.points}
                    setView={setView}
                    appSettings={appSettings}
                    onLogout={handleLogout}
                    user={currentUserData}
                />;
            case 'store':
                return <StorePage
                    user={currentUserData}
                    inventory={inventory}
                    onLogout={handleLogout}
                    showNotification={showNotification}
                    appSettings={appSettings}
                    purchaseHistory={purchaseHistory}
                    cart={cart}
                    setCart={setCart}
                    setView={setView}
                    users={users}
                    firebaseServices={firebaseServices}
                />;
            case 'admin':
                return <AdminDashboard
                    user={currentUserData}
                    onLogout={handleLogout}
                    inventory={inventory}
                    users={users}
                    showNotification={showNotification}
                    executePurchase={executePurchase}
                    pendingOrders={pendingOrders}
                    addNotification={addNotification}
                    appSettings={appSettings}
                    setAppSettings={handleSaveAppSettings}
                    purchaseHistory={purchaseHistory}
                    firebaseServices={firebaseServices}
                    showModal={showModal}
                />;
            default:
                return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
        }
    };

    return (
        <>
            <style>{appStyles}</style>
            <div className="bg-slate-100 min-h-screen font-sans">
                {notification.show && <NotificationBanner message={notification.message} type={notification.type} />}
                <Modal modal={modal} onClose={closeModal} />
                {renderContent()}
            </div>
        </>
    );
}

// --- UI & Child Components ---

const Modal = ({ modal, onClose }) => {
    if (!modal.isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-[101] flex justify-center items-center p-4 animate-fade-in" onClick={onClose}>
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
                <h3 className="text-lg font-bold text-slate-800">{modal.title}</h3>
                <p className="mt-2 text-sm text-slate-600">{modal.message}</p>
                <div className="mt-6 flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 text-sm font-medium bg-slate-200 hover:bg-slate-300 rounded-md">Cancel</button>
                    <button onClick={modal.onConfirm} className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md">Confirm</button>
                </div>
            </div>
        </div>
    );
};

const ErrorPage = ({ message, details }) => (
    <div className="flex items-center justify-center min-h-screen text-red-500 font-semibold text-center p-4 bg-red-50">
        <div className="flex flex-col items-center gap-4 max-w-2xl">
            <ShieldAlert size={48} className="text-red-500"/>
            <h1 className="text-2xl text-slate-800">{message}</h1>
            {details && (
                <div className="mt-2 p-3 bg-red-100 border border-red-200 rounded-md text-left text-sm text-red-800">
                    <p className="font-bold mb-1">Error Details:</p>
                    <code>{details}</code>
                </div>
            )}
        </div>
    </div>
);

const NotificationBanner = ({ message, type }) => {
    let styleType = 'bg-green-500';
    if (type === 'error') styleType = 'bg-red-500';
    if (type === 'warning') styleType = 'bg-amber-500';
    if (type === 'info') styleType = 'bg-blue-500';

    return (
        <div className={`fixed top-0 left-0 right-0 p-4 text-white text-center z-[100] ${styleType} animate-fade-down`}>
            {message}
        </div>
    );
};

const Header = ({ user, onLogout, isAdmin, cartItemCount, onCartClick, appSettings, inflationValue, onInflationChange, onInflationApply }) => (
    <header className="bg-white shadow-md sticky top-0 z-40">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
                <div className="flex items-center space-x-4">
                    <img src={appSettings.logo} alt="Company Logo" className="h-10 w-auto object-contain" onError={(e) => { e.target.onerror = null; e.target.src='https://placehold.co/100/e2e8f0/4a5568?text=Logo'; }}/>
                    <span className="text-xl font-bold text-slate-700 hidden sm:inline">PinnPoints Store</span>
                </div>
                <div className="flex items-center space-x-2 sm:space-x-4">
                    <div className="flex items-center space-x-2">
                        <User className="h-5 w-5 text-slate-500" />
                        <span className="text-sm font-medium text-slate-700">{user.name}</span>
                    </div>
                    {!isAdmin && (
                        <>
                        <div className="flex items-center space-x-2 bg-amber-100 text-amber-800 px-3 py-1 rounded-full">
                            <DollarSign className="h-5 w-5" />
                            <span className="text-sm font-bold">{user.points}</span>
                        </div>
                        <button onClick={onCartClick} className="relative text-slate-600 hover:text-primary transition-colors p-2">
                            <ShoppingCart className="h-6 w-6" />
                            {cartItemCount > 0 &&
                                <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-red-100 bg-red-600 rounded-full transform translate-x-1/2 -translate-y-1/2">
                                    {cartItemCount}
                                </span>
                            }
                        </button>
                        </>
                    )}
                     {isAdmin && (
                         <div className="hidden md:flex items-center gap-2 bg-slate-100 p-1 rounded-lg border">
                             <TrendingUp size={18} className="text-slate-500 ml-1" />
                             <label htmlFor="inflation-input" className="text-sm font-medium text-slate-600">Inflation:</label>
                             <input
                                 id="inflation-input"
                                 type="number"
                                 step="0.5"
                                 value={inflationValue}
                                 onChange={onInflationChange}
                                 className="form-input w-20 p-1 text-sm"
                                 placeholder="%"
                             />
                             <button
                                 onClick={onInflationApply}
                                 className="px-3 py-1 rounded-md bg-primary text-white hover:bg-primary-dark text-sm"
                             >
                                 Apply
                             </button>
                         </div>
                    )}
                    <button onClick={onLogout} className="flex items-center space-x-2 text-slate-600 hover:text-primary transition-colors">
                        <LogOut className="h-5 w-5" />
                        <span className="text-sm font-medium hidden sm:inline">Logout</span>
                    </button>
                </div>
            </div>
        </div>
    </header>
);

const StorePage = ({ user, inventory, onLogout, showNotification, appSettings, purchaseHistory, cart, setCart, setView, firebaseServices }) => {
    const [storeView, setStoreView] = useState('store');
    const unreadCount = user.notifications ? user.notifications.filter(n => !n.read).length : 0;
    const userPurchaseHistory = purchaseHistory.filter(p => p.employeeId === user.uid).sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, 5);

    const handleAddToCart = (item) => {
        const itemInCart = cart.find(cartItem => cartItem.id === item.id);
        const currentQtyInCart = itemInCart ? itemInCart.quantity : 0;

        if (item.stock > currentQtyInCart) {
            if (itemInCart) {
                setCart(cart.map(cartItem => cartItem.id === item.id ? { ...cartItem, quantity: cartItem.quantity + 1 } : cartItem));
            } else {
                setCart([...cart, { ...item, quantity: 1 }]);
            }
            showNotification(`${item.name} added to cart.`, 'success', 1500);
        } else {
            showNotification(`Not enough stock for ${item.name}.`, 'warning');
        }
    };

    const handleViewNotifications = async () => {
        setStoreView('notifications');
        if (unreadCount === 0) return;

        const { db } = firebaseServices;
        try {
            const userRef = doc(db, collections.users, user.uid);
            const userSnap = await getDoc(userRef);
            if (userSnap.exists()) {
                const notifications = userSnap.data().notifications.map(n => ({ ...n, read: true }));
                await updateDoc(userRef, { notifications });
            }
        } catch (error) {
            console.error("Error marking notifications as read:", error);
        }
    };

    const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

    return (
        <div className="bg-slate-50 min-h-screen">
            <Header user={user} onLogout={onLogout} cartItemCount={cartItemCount} onCartClick={() => setView('cart')} appSettings={appSettings} />
            <main className="container mx-auto p-4 sm:p-6 lg:p-8">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 border-b pb-4 gap-4">
                    <h2 className="text-2xl sm:text-3xl font-bold text-slate-800">
                        {storeView === 'store' ? 'PinnPoints Store' : 'Your Notifications'}
                    </h2>
                    <div className="flex space-x-1 bg-slate-200 p-1 rounded-lg">
                        <button onClick={() => setStoreView('store')} className={`px-3 py-2 text-sm font-medium rounded-md flex items-center gap-2 ${storeView === 'store' ? 'bg-white shadow' : 'text-slate-600 hover:bg-slate-300'}`}>
                            <Package size={16} /> Store
                        </button>
                        <button onClick={handleViewNotifications} className={`px-3 py-2 text-sm font-medium rounded-md flex items-center gap-2 relative ${storeView === 'notifications' ? 'bg-white shadow' : 'text-slate-600 hover:bg-slate-300'}`}>
                            <Bell size={16} /> Notifications
                            {unreadCount > 0 && <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-xs text-white">{unreadCount}</span>}
                        </button>
                    </div>
                </div>

                {storeView === 'store' ? (
                    <>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {inventory.filter(item => item.stock > 0).map(item => (
                                <div key={item.id} className="bg-white rounded-lg shadow-sm overflow-hidden flex flex-col transition-shadow hover:shadow-lg border">
                                    <div className="w-full h-48 flex-shrink-0">
                                        <img src={item.image} alt={item.name} className="w-full h-full object-cover" onError={(e) => { e.target.onerror = null; e.target.src = `https://placehold.co/400x400/e2e8f0/4a5568?text=${encodeURIComponent(item.name)}`; }} />
                                    </div>
                                    <div className="p-4 flex flex-col flex-grow">
                                        <h3 className="text-base font-semibold text-slate-800 leading-snug">{item.name}</h3>
                                        <div className="mt-2 mb-3">
                                            <div className="flex items-baseline gap-2">
                                                <p className="text-xl font-bold text-primary">{item.points?.toLocaleString()}</p>
                                                {item.points !== item.basePoints && (
                                                    <p className="text-sm text-slate-500 line-through">{item.basePoints?.toLocaleString()}</p>
                                                )}
                                            </div>
                                        </div>
                                        <p className="text-xs text-slate-500 mb-3">Stock: {item.stock}</p>
                                        <button onClick={() => handleAddToCart(item)} className="w-full mt-auto flex items-center justify-center py-2 px-2 border border-primary text-primary hover:bg-primary-light transition-colors text-sm rounded-md font-semibold">
                                            Add to Cart
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="mt-12">
                             <PurchaseHistory history={userPurchaseHistory} title="Your Recent Purchases" isAdminView={false} />
                        </div>
                    </>
                ) : (
                    <NotificationList notifications={user.notifications} />
                )}
            </main>
        </div>
    );
};

const NotificationList = ({ notifications }) => (
    <div className="bg-white p-6 rounded-xl shadow-lg max-w-4xl mx-auto">
        <div className="space-y-4">
            {notifications && notifications.length > 0 ? (
                notifications.map(n => (
                    <div key={n.id} className={`p-4 rounded-lg flex items-start gap-4 ${n.type === 'success' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'} border`}>
                        <div>{n.type === 'success' ? <CheckCircle className="text-green-500 mt-1" /> : <XCircle className="text-red-500 mt-1" />}</div>
                        <div>
                            <p className="font-medium text-slate-800">{n.message}</p>
                            <p className="text-xs text-slate-500">{new Date(n.timestamp).toLocaleString()}</p>
                        </div>
                    </div>
                ))
            ) : (
                <p className="text-slate-500 text-center py-8">You have no notifications.</p>
            )}
        </div>
    </div>
);

const CartPage = ({ user, onLogout, cart, onUpdateQuantity, onConfirmPurchase, userPoints, setView, appSettings }) => {
    const totalCost = cart.reduce((sum, item) => sum + (item.points * item.quantity), 0);
    const canAfford = userPoints >= totalCost;

    return (
        <div className="bg-slate-50 min-h-screen">
            <Header user={user} onLogout={onLogout} cartItemCount={cart.length} onCartClick={() => {}} appSettings={appSettings} />
            <main className="container mx-auto p-4 sm:p-6 lg:p-8">
                <button onClick={() => setView('store')} className="flex items-center gap-2 text-slate-600 hover:text-primary mb-6 font-semibold">
                    <ArrowLeft size={18} /> Back to Store
                </button>
                <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-4xl mx-auto">
                    <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2 mb-4 border-b pb-4"><ShoppingCart /> Your Cart</h2>
                    <div className="space-y-3 mb-4 max-h-[50vh] overflow-y-auto pr-2">
                        {cart.length === 0 ? <p className="text-slate-500 text-center text-sm py-8">Your cart is empty.</p> :
                            cart.map(item => (
                                <div key={item.id} className="flex items-center justify-between text-sm p-2 bg-slate-50 rounded-lg">
                                    <div className="flex items-center gap-3">
                                        <img src={item.image} alt={item.name} className="h-12 w-12 rounded-md object-cover" onError={(e) => { e.target.onerror = null; e.target.src = `https://placehold.co/100/e2e8f0/4a5568?text=${encodeURIComponent(item.name)}`; }}/>
                                        <div>
                                            <p className="font-semibold">{item.name}</p>
                                            <p className="text-slate-500">{item.points} pts each</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button onClick={() => onUpdateQuantity(item.id, item.quantity - 1)} className="p-1 rounded-full bg-slate-200 hover:bg-slate-300"><MinusCircle size={18} /></button>
                                        <span className="w-6 text-center font-semibold">{item.quantity}</span>
                                        <button onClick={() => onUpdateQuantity(item.id, item.quantity + 1)} className="p-1 rounded-full bg-slate-200 hover:bg-slate-300"><PlusCircle size={18} /></button>
                                        <button onClick={() => onUpdateQuantity(item.id, 0)} className="p-1 text-red-500 hover:bg-red-100 rounded-full"><Trash size={18} /></button>
                                    </div>
                                </div>
                            ))
                        }
                    </div>
                    {cart.length > 0 && (
                        <div className="border-t pt-4">
                            <div className="space-y-2 text-md">
                                <div className="flex justify-between"><span>Your Points:</span> <span>{userPoints}</span></div>
                                <div className="flex justify-between font-semibold"><span>Total Cost:</span> <span>- {totalCost}</span></div>
                                <div className={`flex justify-between font-bold text-lg border-t pt-2 mt-2 ${canAfford ? 'text-primary' : 'text-red-600'}`}><span>Remaining (if approved):</span> <span>{userPoints - totalCost}</span></div>
                            </div>
                            <div className="flex justify-end pt-6">
                                <button onClick={onConfirmPurchase} disabled={!canAfford} className="px-6 py-2 rounded-lg bg-primary text-white hover:bg-primary-dark disabled:bg-slate-400 disabled:cursor-not-allowed w-full sm:w-auto">
                                    Request Purchase
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

const AdminDashboard = ({ user, onLogout, inventory, users, showNotification, executePurchase, pendingOrders, addNotification, appSettings, setAppSettings, purchaseHistory, firebaseServices, showModal }) => {
    const [adminView, setAdminView] = useState('overview');
    const [inflationInput, setInflationInput] = useState(appSettings.inflation);
    const [editingUser, setEditingUser] = useState(null);

    useEffect(() => {
        setInflationInput(appSettings.inflation);
    }, [appSettings.inflation]);

    const handleApplyInflation = () => {
        const { db } = firebaseServices;
        const newInflation = parseFloat(inflationInput);
        if (isNaN(newInflation)) {
            showNotification('Invalid inflation value.', 'error');
            return;
        }
        
        setAppSettings({...appSettings, inflation: newInflation });

        const batch = writeBatch(db);
        inventory.forEach(item => {
            const newPoints = Math.round(item.basePoints * (1 + newInflation / 100));
            const itemRef = doc(db, collections.inventory, item.id);
            batch.update(itemRef, { points: newPoints });
        });

        batch.commit()
            .then(() => showNotification(`Inflation set to ${newInflation}%. Item prices updated.`, 'success'))
            .catch(err => showNotification(`Failed to apply inflation: ${err.message}`, 'error'));
    };

    const handleEditUserClick = (userId) => {
        setEditingUser(users[userId]);
        setAdminView('editEmployee');
    };

    const handleSaveUser = async (userId, userData) => {
        try {
            const userRef = doc(firebaseServices.db, collections.users, userId);
            await updateDoc(userRef, userData);
            showNotification(`${userData.name}'s details updated successfully.`, 'success');
            setEditingUser(null);
            setAdminView('employees');
        } catch (error) {
            showNotification(error.message, 'error');
        }
    };

    const renderAdminContent = () => {
        switch (adminView) {
            case 'inventory': return <InventoryManagement inventory={inventory} showNotification={showNotification} appSettings={appSettings} firebaseServices={firebaseServices} showModal={showModal}/>;
            case 'employees': return <EmployeeManagement users={Object.values(users)} showNotification={showNotification} onEditUser={handleEditUserClick} firebaseServices={firebaseServices} showModal={showModal}/>;
            case 'editEmployee': return <EditEmployeePage user={editingUser} onSave={handleSaveUser} setAdminView={setAdminView} />;
            case 'checkout': return <CheckoutPOS users={users} inventory={inventory} executePurchase={executePurchase} showNotification={showNotification} />;
            case 'settings': return <AppSettingsPage appSettings={appSettings} onSave={setAppSettings} showNotification={showNotification} />;
            case 'approvals': return <ApprovalQueue pendingOrders={pendingOrders} users={users} executePurchase={executePurchase} showNotification={showNotification} addNotification={addNotification} firebaseServices={firebaseServices} />;
            case 'overview': default:
                return (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <Leaderboard users={Object.values(users)} title="Top 10 Employees" />
                        <PurchaseHistory history={purchaseHistory.sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, 5)} title="Recent Store Purchases" isAdminView={true} />
                    </div>
                );
        }
    }

    return (
        <div className="bg-slate-50 min-h-screen">
            <Header
                user={user}
                onLogout={onLogout}
                isAdmin={true}
                appSettings={appSettings}
                inflationValue={inflationInput}
                onInflationChange={(e) => setInflationInput(e.target.value)}
                onInflationApply={handleApplyInflation}
            />
            <div className="container mx-auto p-4 sm:p-6 lg:p-8">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 border-b pb-4 gap-4">
                    <h2 className="text-3xl font-bold text-slate-800">Admin Dashboard</h2>
                    <div className="flex flex-wrap gap-1 bg-slate-200 p-1 rounded-lg">
                        {[{v: 'overview', l: 'Overview', i: TrendingUp}, {v: 'approvals', l: 'Approvals', i: Bell}, {v: 'checkout', l: 'Checkout', i: ShoppingCart}, {v: 'inventory', l: 'Inventory', i: Package}, {v: 'employees', l: 'Employees', i: Users}, {v: 'settings', l: 'Settings', i: Settings}].map(navItem => (
                            <button key={navItem.v} onClick={() => setAdminView(navItem.v)} className={`px-3 py-2 text-sm font-medium rounded-md flex items-center gap-2 relative ${adminView === navItem.v ? 'bg-white shadow' : 'text-slate-600 hover:bg-slate-300'}`}>
                                <navItem.i size={16}/> {navItem.l}
                                {navItem.v === 'approvals' && pendingOrders.length > 0 && <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-xs text-white">{pendingOrders.length}</span>}
                            </button>
                        ))}
                    </div>
                </div>
                {renderAdminContent()}
            </div>
        </div>
    );
};

const Leaderboard = ({ users, title }) => {
    const employeeList = users.filter((user) => user.role === 'employee');
    const sortedEmployees = [...employeeList].sort((a, b) => b.points - a.points).slice(0, 10);

    const getRankIndicator = (rank) => {
        if (rank === 0) return <Award className="text-amber-400" />;
        if (rank === 1) return <Award className="text-slate-400" />;
        if (rank === 2) return <Award className="text-amber-600" />;
        return <span className="font-mono text-slate-500">{rank + 1}</span>;
    }

    return (
        <div className="bg-white p-6 rounded-xl shadow-lg">
            <h3 className="text-xl font-bold text-slate-700 mb-4">{title}</h3>
            <ol className="space-y-3">
                {sortedEmployees.map((employee, index) => (
                    <li key={employee.uid} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                        <div className="flex items-center gap-4">
                            <span className="w-6 text-center flex justify-center">{getRankIndicator(index)}</span>
                            <span className="font-medium text-slate-800">{employee.name}</span>
                        </div>
                        <span className="font-bold text-primary">{employee.points.toLocaleString()} pts</span>
                    </li>
                ))}
            </ol>
        </div>
    )
};

const PurchaseHistory = ({ history, title, isAdminView }) => (
    <div className="bg-white p-6 rounded-xl shadow-lg">
        <h3 className="text-xl font-bold text-slate-700 mb-4">{title}</h3>
        <div className="space-y-4">
            {history.length === 0 ? (
                <p className="text-slate-500 text-center py-8">No purchase history yet.</p>
            ) : (
                history.map(purchase => (
                    <div key={purchase.id} className="border-b pb-3 last:border-b-0">
                        {isAdminView && <p className="font-bold text-slate-800">{purchase.employeeName}</p>}
                        <div className="text-sm text-slate-500 flex justify-between">
                            <span>{new Date(purchase.timestamp).toLocaleString()}</span>
                            <span className="font-semibold text-slate-600">Total: {purchase.totalCost} pts</span>
                        </div>
                        <ul className="list-disc list-inside text-sm text-slate-600 mt-1 pl-2">
                            {purchase.cart.map(item => <li key={`${purchase.id}-${item.id}`}>{item.name} (x{item.quantity})</li>)}
                        </ul>
                    </div>
                ))
            )}
        </div>
    </div>
);

const AppSettingsPage = ({ appSettings, onSave, showNotification }) => {
    const fileInputRef = useRef(null);
    const [localSettings, setLocalSettings] = useState(appSettings);

    useEffect(() => {
        setLocalSettings(appSettings);
    }, [appSettings]);

    const handleLogoChange = (event) => {
        const file = event.target.files[0];
        if (!file) return;
        if (file.size > 1 * 1024 * 1024) { // 1MB limit for base64
            showNotification('Image file is too large (max 1MB).', 'error');
            return;
        }
        const reader = new FileReader();
        reader.onloadend = () => {
            setLocalSettings(prev => ({ ...prev, logo: reader.result }));
        };
        reader.readAsDataURL(file);
    };

    const handleThemeChange = (themeKey) => {
        setLocalSettings(prev => ({ ...prev, theme: themeKey }));
    };

    const handleSaveClick = () => {
        onSave(localSettings);
    };

    return (
        <div className="bg-white p-6 rounded-xl shadow-lg max-w-4xl mx-auto">
            <h3 className="text-xl font-bold text-slate-700 mb-6">Application Settings</h3>
            <div className="space-y-8">
                <div>
                    <h4 className="text-lg font-semibold text-slate-600 mb-2">Company Logo</h4>
                    <div className="flex items-center gap-4">
                        <img src={localSettings.logo} alt="Current Logo" className="h-16 w-16 p-2 border rounded-lg object-contain bg-slate-50" onError={(e) => { e.target.onerror = null; e.target.src='https://placehold.co/100/e2e8f0/4a5568?text=Logo'; }}/>
                        <input type="file" ref={fileInputRef} onChange={handleLogoChange} className="hidden" accept="image/png, image/jpeg, image/gif" />
                        <button type="button" onClick={() => fileInputRef.current.click()} className="px-4 py-2 rounded-lg bg-slate-200 hover:bg-slate-300 text-sm">Upload New Logo</button>
                    </div>
                </div>
                <div>
                    <h4 className="text-lg font-semibold text-slate-600 mb-3">Color Theme</h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {Object.entries(themes).map(([key, theme]) => (
                            <button key={key} onClick={() => handleThemeChange(key)} className={`border-2 rounded-lg p-3 text-left transition-all ${localSettings.theme === key ? 'border-primary scale-105 shadow-md' : 'border-transparent hover:border-slate-300'}`}>
                                <div className="flex gap-2">
                                    <div className="w-6 h-6 rounded-full" style={{ backgroundColor: theme.primary }}></div>
                                    <div className="w-6 h-6 rounded-full" style={{ backgroundColor: theme.light }}></div>
                                    <div className="w-6 h-6 rounded-full" style={{ backgroundColor: theme.dark }}></div>
                                </div>
                                <p className="mt-2 text-sm font-medium text-slate-700">{theme.name}</p>
                            </button>
                        ))}
                    </div>
                </div>
            </div>
            <div className="flex justify-end mt-8 border-t pt-6">
                <button onClick={handleSaveClick} className="px-6 py-2 rounded-lg bg-primary text-white hover:bg-primary-dark">Save Settings</button>
            </div>
        </div>
    );
};

const ApprovalQueue = ({ pendingOrders, users, executePurchase, showNotification, addNotification, firebaseServices }) => {
    
    const handleApprove = async (order) => {
        const result = await executePurchase(order.employeeId, order.cart, true);
        if (result.success) {
            showNotification(`Order for ${users[order.employeeId]?.name || 'Unknown'} approved.`, 'success');
            await deleteDoc(doc(firebaseServices.db, collections.pendingOrders, order.id));
        } else {
            showNotification(`Approval failed. ${result.message}`, 'error');
            await addNotification(order.employeeId, `Your purchase request was denied due to an error: ${result.message}`, 'error');
            await deleteDoc(doc(firebaseServices.db, collections.pendingOrders, order.id));
        }
    };

    const handleDeny = async (order) => {
        const purchasedItems = order.cart.map(item => `${item.name} (x${item.quantity})`).join(', ');
        await addNotification(order.employeeId, `Your purchase request for ${purchasedItems} has been denied by the admin.`, 'error');
        await deleteDoc(doc(firebaseServices.db, collections.pendingOrders, order.id));
        showNotification(`Order has been denied.`, 'warning');
    };

    return (
        <div className="bg-white p-6 rounded-xl shadow-lg">
            <h3 className="text-xl font-bold text-slate-700 mb-4">Pending Purchase Approvals</h3>
            {pendingOrders.length === 0 ? (
                <p className="text-slate-500 text-center py-8">No pending approvals.</p>
            ) : (
                <div className="space-y-4">
                    {pendingOrders.map(order => {
                        const employee = users[order.employeeId];
                        if (!employee) return null; // Failsafe if user was deleted
                        const totalCost = order.cart.reduce((sum, item) => sum + (item.points * item.quantity), 0);
                        const canAfford = employee.points >= totalCost;
                        return (
                            <div key={order.id} className="border rounded-lg p-4">
                                <div className="flex justify-between items-start flex-wrap gap-2">
                                    <div>
                                        <p className="font-bold text-lg">{employee.name}</p>
                                        <p className={`text-sm ${canAfford ? 'text-green-600' : 'text-red-600'}`}>Points: {employee.points} / Required: {totalCost}</p>
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={() => handleApprove(order)} disabled={!canAfford} className="flex items-center gap-2 bg-green-500 text-white px-3 py-2 text-sm rounded-lg hover:bg-green-600 disabled:bg-slate-400">
                                            <CheckCircle size={16} /> Approve
                                        </button>
                                        <button onClick={() => handleDeny(order)} className="flex items-center gap-2 bg-red-500 text-white px-3 py-2 text-sm rounded-lg hover:bg-red-600">
                                            <XCircle size={16} /> Deny
                                        </button>
                                    </div>
                                </div>
                                <div className="mt-4 border-t pt-4 space-y-2">
                                    {order.cart.map(item => (
                                        <div key={item.id} className="flex justify-between items-center text-sm">
                                            <span>{item.name} (x{item.quantity})</span><span>{item.points * item.quantity} pts</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    );
};

const CheckoutPOS = ({ users, inventory, executePurchase, showNotification }) => {
    const [selectedUser, setSelectedUser] = useState('');
    const [cart, setCart] = useState([]);
    
    const employeeList = Object.values(users).filter((user) => user.role === 'employee');
    const availableItems = inventory.filter(item => item.stock > 0);
    const totalCost = cart.reduce((sum, item) => sum + (item.points * item.quantity), 0);
    const currentEmployee = users[selectedUser];

    const handleAddToCart = (itemId) => {
        const item = inventory.find(i => i.id === itemId);
        if (!item) return;
        const itemInCart = cart.find(cartItem => cartItem.id === item.id);
        const currentQtyInCart = itemInCart ? itemInCart.quantity : 0;
        if (item.stock > currentQtyInCart) {
            if (itemInCart) {
                setCart(cart.map(c => c.id === item.id ? { ...c, quantity: c.quantity + 1 } : c));
            } else {
                setCart([...cart, { ...item, quantity: 1 }]);
            }
        } else {
            showNotification(`Not enough stock for ${item.name}.`, 'warning');
        }
    };

    const handleUpdateQuantity = (itemId, newQuantity) => {
        const item = inventory.find(i => i.id === itemId);
        if (newQuantity <= 0) {
            setCart(cart.filter(cartItem => cartItem.id !== itemId));
        } else if (item.stock >= newQuantity) {
            setCart(cart.map(c => c.id === itemId ? { ...c, quantity: newQuantity } : c));
        } else {
            showNotification(`Only ${item.stock} of ${item.name} available.`, 'warning');
            setCart(cart.map(c => c.id === itemId ? { ...c, quantity: item.stock } : c));
        }
    };
    
    const handleCheckout = async () => {
        if (!currentEmployee) { showNotification('Please select an employee.', 'error'); return; }
        if (cart.length === 0) { showNotification('Cart is empty.', 'error'); return; }
        
        const result = await executePurchase(selectedUser, cart);
        if (result.success) {
            showNotification(`Checkout successful for ${currentEmployee.name}!`, 'success');
            setCart([]);
        } else {
            showNotification(result.message || 'Checkout failed.', 'error');
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white p-4 sm:p-6 rounded-xl shadow-lg">
                <h3 className="text-xl font-bold text-slate-700 mb-4">Select Items</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
                    {availableItems.map(item => (
                        <div key={item.id} className="border rounded-lg p-3 flex flex-col items-center text-center">
                            <img src={item.image} alt={item.name} className="w-24 h-24 object-cover rounded-md mb-2" onError={(e) => { e.target.onerror = null; e.target.src = `https://placehold.co/100/e2e8f0/4a5568?text=${encodeURIComponent(item.name)}`; }} />
                            <p className="font-semibold text-sm flex-grow">{item.name}</p>
                            <span className="text-base font-bold text-primary">{item.points} pts</span>
                            <button onClick={() => handleAddToCart(item.id)} className="w-full mt-2 bg-primary-light text-primary-dark hover:bg-primary/20 text-xs font-bold py-2 px-2 rounded-md flex items-center justify-center gap-1">
                                <PlusCircle size={14} /> Add
                            </button>
                        </div>
                    ))}
                </div>
            </div>
            <div className="lg:col-span-1">
                <div className="bg-white p-6 rounded-xl shadow-lg sticky top-24">
                    <h3 className="text-xl font-bold text-slate-700 mb-4">Transaction</h3>
                    <select value={selectedUser} onChange={e => { setSelectedUser(e.target.value); setCart([]); }} className="w-full form-input mb-4" required>
                        <option value="" disabled>-- Choose an employee --</option>
                        {employeeList.map(user => <option key={user.uid} value={user.uid}>{user.name}</option>)}
                    </select>

                    <div className="space-y-2 mb-4 max-h-60 overflow-y-auto pr-2">
                        {cart.length === 0 ? <p className="text-slate-500 text-center text-sm py-4">Cart is empty</p> :
                            cart.map(item => (
                                <div key={item.id} className="flex items-center justify-between text-sm">
                                    <div><p className="font-semibold">{item.name}</p><p className="text-slate-500">{item.points} pts each</p></div>
                                    <div className="flex items-center gap-2">
                                        <button onClick={() => handleUpdateQuantity(item.id, item.quantity - 1)} className="p-1 rounded-full bg-slate-200 hover:bg-slate-300"><MinusCircle size={16} /></button>
                                        <span>{item.quantity}</span>
                                        <button onClick={() => handleUpdateQuantity(item.id, item.quantity + 1)} className="p-1 rounded-full bg-slate-200 hover:bg-slate-300"><PlusCircle size={16} /></button>
                                        <button onClick={() => handleUpdateQuantity(item.id, 0)} className="p-1 text-red-500 hover:bg-red-100 rounded-full"><Trash size={16} /></button>
                                    </div>
                                </div>
                            ))
                        }
                    </div>

                    {currentEmployee && (
                        <div className="border-t pt-4 space-y-2 text-sm">
                            <div className="flex justify-between"><span>Current Points:</span> <span>{currentEmployee.points}</span></div>
                            <div className="flex justify-between font-semibold"><span>Total Cost:</span> <span>- {totalCost}</span></div>
                            <div className={`flex justify-between font-bold text-lg border-t pt-2 mt-2 ${currentEmployee.points - totalCost >= 0 ? 'text-primary' : 'text-red-500'}`}><span>Remaining:</span> <span>{currentEmployee.points - totalCost}</span></div>
                        </div>
                    )}
                    <button onClick={handleCheckout} disabled={!selectedUser || cart.length === 0} className="w-full mt-4 flex justify-center py-2 px-4 rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-dark disabled:bg-slate-400">
                        Complete Checkout
                    </button>
                </div>
            </div>
        </div>
    );
};

const InventoryManagement = ({ inventory, showNotification, appSettings, firebaseServices, showModal }) => {
    const { db } = firebaseServices;
    const [editingRowId, setEditingRowId] = useState(null);
    const [editFormData, setEditFormData] = useState({});
    const [isAdding, setIsAdding] = useState(false);
    const [newItemData, setNewItemData] = useState({ name: '', basePoints: '', stock: '', image: '' });
    
    const handleEditClick = (item) => { setEditingRowId(item.id); setEditFormData({ ...item }); };
    const handleCancelClick = () => { setEditingRowId(null); };
    const handleEditFormChange = (e) => setEditFormData({ ...editFormData, [e.target.name]: e.target.value });

    const handleSaveClick = async (itemId) => {
        const { name, basePoints, stock } = editFormData;
        if (!name || basePoints === '' || stock === '') {
            showNotification('Name, Base Points, and Stock are required.', 'error'); return;
        }
        const calculatedPoints = Math.round(Number(basePoints) * (1 + (appSettings.inflation || 0) / 100));
        try {
            await updateDoc(doc(db, collections.inventory, itemId), { ...editFormData, basePoints: Number(basePoints), stock: Number(stock), points: calculatedPoints });
            setEditingRowId(null);
            showNotification('Item updated successfully.', 'success');
        } catch (error) { showNotification(error.message, 'error'); }
    };

    const handleDeleteItem = (itemId, itemName) => {
        showModal(
            `Delete ${itemName}?`,
            'Are you sure you want to permanently delete this item? This action cannot be undone.',
            async () => {
                try {
                    await deleteDoc(doc(db, collections.inventory, itemId));
                    showNotification("Item deleted successfully.", "success");
                } catch(error) { showNotification(error.message, 'error'); }
            }
        );
    };

    const handleAddNewItem = async (e) => {
        e.preventDefault();
        const { name, basePoints, stock, image } = newItemData;
        if (!name || basePoints === '' || stock === '') {
            showNotification('Name, Base Points, and Stock are required.', 'error'); return;
        }
        const calculatedPoints = Math.round(Number(basePoints) * (1 + (appSettings.inflation || 0) / 100));
        const newItem = { name, basePoints: Number(basePoints), stock: Number(stock), image: image || `https://placehold.co/100x100/e2e8f0/4a5568?text=${encodeURIComponent(name)}`, points: calculatedPoints };
        try {
            await addDoc(collection(db, collections.inventory), newItem);
            showNotification("Item added successfully.", "success");
            setNewItemData({ name: '', basePoints: '', stock: '', image: '' });
            setIsAdding(false);
        } catch (error) { showNotification(error.message, 'error'); }
    };

    return (
        <div className="bg-white p-6 rounded-xl shadow-lg">
            <div className="flex flex-wrap justify-between items-center mb-4 gap-3">
                <h3 className="text-xl font-bold text-slate-700">Manage Inventory</h3>
                <button onClick={() => setIsAdding(!isAdding)} className="flex items-center bg-primary text-white px-3 py-2 rounded-lg hover:bg-primary-dark transition-colors text-sm">
                    {isAdding ? <XCircle className="h-4 w-4 mr-2" /> : <PlusCircle className="h-4 w-4 mr-2" />}
                    {isAdding ? 'Cancel' : 'Add Item'}
                </button>
            </div>

            {isAdding && (
                <form onSubmit={handleAddNewItem} className="p-4 border rounded-lg bg-slate-50 mb-4 animate-fade-down">
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                        <input type="text" name="name" placeholder="Item Name" value={newItemData.name} onChange={e => setNewItemData({...newItemData, name: e.target.value})} className="form-input md:col-span-2" required />
                        <input type="number" name="basePoints" placeholder="Base Points" value={newItemData.basePoints} onChange={e => setNewItemData({...newItemData, basePoints: e.target.value})} className="form-input" required />
                        <input type="number" name="stock" placeholder="Stock" value={newItemData.stock} onChange={e => setNewItemData({...newItemData, stock: e.target.value})} className="form-input" required />
                        <input type="text" name="image" placeholder="Image URL (optional)" value={newItemData.image} onChange={e => setNewItemData({...newItemData, image: e.target.value})} className="form-input" />
                    </div>
                    <div className="flex justify-end gap-2 mt-4">
                        <button type="submit" className="flex items-center bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 text-sm">Save New Item</button>
                    </div>
                </form>
            )}

            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left text-slate-500">
                    <thead className="text-xs text-slate-700 uppercase bg-slate-50"><tr>
                        <th scope="col" className="px-6 py-3">Item</th><th scope="col" className="px-6 py-3">Base Points</th><th scope="col" className="px-6 py-3">Current Pts</th><th scope="col" className="px-6 py-3">Stock</th><th scope="col" className="px-6 py-3 text-right">Actions</th>
                    </tr></thead>
                    <tbody>{inventory.map(item => (
                        <tr key={item.id} className="bg-white border-b hover:bg-slate-50 align-middle">
                            {editingRowId === item.id ? (
                                <>
                                    <td className="px-6 py-2"><input type="text" name="name" value={editFormData.name} onChange={handleEditFormChange} className="form-input text-sm p-1 w-full" /></td>
                                    <td className="px-6 py-2"><input type="number" name="basePoints" value={editFormData.basePoints} onChange={handleEditFormChange} className="form-input w-24 p-1 text-sm" /></td>
                                    <td className="px-6 py-2">{item.points}</td>
                                    <td className="px-6 py-2"><input type="number" name="stock" value={editFormData.stock} onChange={handleEditFormChange} className="form-input w-24 p-1 text-sm" /></td>
                                    <td className="px-6 py-2 text-right"><div className="flex justify-end space-x-2">
                                        <button onClick={() => handleSaveClick(item.id)} className="p-2 text-green-600 hover:bg-green-100 rounded-full"><CheckCircle className="h-5 w-5"/></button>
                                        <button onClick={handleCancelClick} className="p-2 text-slate-600 hover:bg-slate-100 rounded-full"><XCircle className="h-5 w-5"/></button>
                                    </div></td>
                                </>
                            ) : (
                                <>
                                    <td className="px-6 py-4 font-medium text-slate-900"><div className="flex items-center gap-4">
                                        <img src={item.image} alt={item.name} className="h-12 w-12 rounded-md object-cover" onError={(e) => { e.target.onerror = null; e.target.src=`https://placehold.co/100/e2e8f0/4a5568?text=${encodeURIComponent(item.name)}`; }}/> {item.name}
                                    </div></td>
                                    <td className="px-6 py-4">{item.basePoints}</td>
                                    <td className="px-6 py-4 font-semibold text-primary">{item.points}</td>
                                    <td className="px-6 py-4">{item.stock}</td>
                                    <td className="px-6 py-4 text-right"><div className="flex justify-end space-x-2">
                                        <button onClick={() => handleEditClick(item)} className="p-2 text-blue-600 hover:bg-blue-100 rounded-full"><Edit className="h-5 w-5"/></button>
                                        <button onClick={() => handleDeleteItem(item.id, item.name)} className="p-2 text-red-600 hover:bg-red-100 rounded-full"><Trash2 className="h-5 w-5"/></button>
                                    </div></td>
                                </>
                            )}
                        </tr>
                    ))}</tbody>
                </table>
            </div>
        </div>
    );
};

const EmployeeManagement = ({ users, showNotification, onEditUser, firebaseServices, showModal }) => {
    const { db } = firebaseServices;

    const handleRemoveEmployee = (userId, name) => {
        showModal(
            `Remove ${name}?`,
            `Are you sure? This will remove "${name}" from the application. This action is not easily reversible.`,
            async () => {
                try {
                    await deleteDoc(doc(db, collections.users, userId));
                    showNotification(`Employee "${name}" has been removed.`, "success");
                } catch (error) { showNotification(error.message, 'error'); }
            }
        );
    };

    const handleAddPoints = async (file) => {
        if (!file || !window.XLSX) return;
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = window.XLSX.read(data, { type: 'array' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const json = window.XLSX.utils.sheet_to_json(worksheet);

                if (!json.length) { showNotification("File is empty.", "warning"); return; }

                const batch = writeBatch(db);
                let updates = 0;

                for (const row of json) {
                    const pointsToAdd = Number(row.points_to_add);
                    if (row.email && !isNaN(pointsToAdd)) {
                        const userQuery = query(collection(db, collections.users), where("email", "==", row.email));
                        const querySnapshot = await getDocs(userQuery);
                        if (!querySnapshot.empty) {
                            const userDoc = querySnapshot.docs[0];
                            const currentPoints = userDoc.data().points || 0;
                            batch.update(userDoc.ref, { points: currentPoints + pointsToAdd });
                            updates++;
                        }
                    }
                }
                
                if (updates > 0) {
                   await batch.commit();
                   showNotification(`Successfully added points to ${updates} employee(s).`, 'success');
                } else {
                   showNotification('No matching employees found in the file to update.', 'warning');
                }
            } catch (error) {
                showNotification(`Failed to process file: ${error.message}`, "error");
            }
        };
        reader.readAsArrayBuffer(file);
    };

    return (
        <BulkUploadComponent
            title="Manage Employees"
            onUpload={handleAddPoints}
            templateData={[{ email: 'employee1@example.com', points_to_add: 100 }]}
            templateFilename="add_points_template.xlsx"
        >
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left text-slate-500">
                    <thead className="text-xs text-slate-700 uppercase bg-slate-50"><tr>
                        <th className="px-6 py-3">Employee Name</th><th className="px-6 py-3">Email</th><th className="px-6 py-3">Current Points</th><th className="px-6 py-3 text-right">Actions</th>
                    </tr></thead>
                    <tbody>
                        {users.filter(u => u.role === 'employee').map((user) => (
                            <tr key={user.uid} className="bg-white border-b hover:bg-slate-50">
                                <th className="px-6 py-4 font-medium text-slate-900">{user.name}</th>
                                <td className="px-6 py-4">{user.email}</td><td className="px-6 py-4">{user.points}</td>
                                <td className="px-6 py-4 text-right"><div className="flex justify-end space-x-2">
                                    <button onClick={() => onEditUser(user.uid)} className="p-2 text-blue-600 hover:bg-blue-100 rounded-full"><Edit className="h-5 w-5" /></button>
                                    <button onClick={() => handleRemoveEmployee(user.uid, user.name)} className="p-2 text-red-600 hover:bg-red-100 rounded-full"><Trash2 className="h-5 w-5" /></button>
                                </div></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </BulkUploadComponent>
    );
};

const BulkUploadComponent = ({ title, onUpload, templateData, templateFilename, children }) => {
    const fileInputRef = useRef(null);
    const handleFileChange = (e) => {
        if(e.target.files[0]) onUpload(e.target.files[0]);
        e.target.value = null; // Reset input
    };
    const handleDownloadTemplate = () => {
        if (!window.XLSX) { return; }
        const ws = window.XLSX.utils.json_to_sheet(templateData);
        const wb = window.XLSX.utils.book_new();
        window.XLSX.utils.book_append_sheet(wb, ws, "Template");
        window.XLSX.writeFile(wb, templateFilename);
    };

    return (
        <div className="bg-white p-6 rounded-xl shadow-lg">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-slate-700">{title}</h3>
                <div className="flex items-center gap-2">
                    <button onClick={handleDownloadTemplate} className="flex items-center bg-gray-600 text-white px-3 py-2 rounded-lg hover:bg-gray-700 text-sm"><Download className="h-4 w-4 mr-2" />Template</button>
                    <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept=".xlsx, .xls, .csv" />
                    <button onClick={() => fileInputRef.current.click()} className="flex items-center bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-700 text-sm"><Upload className="h-4 w-4 mr-2" />Upload</button>
                </div>
            </div>
            {children}
        </div>
    );
};


const EditEmployeePage = ({ user, onSave, setAdminView }) => {
    const [name, setName] = useState(user.name);
    const [points, setPoints] = useState(user.points);

    return (
        <div className="bg-white p-8 rounded-lg shadow-2xl w-full max-w-2xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-slate-800">Edit: {user.email}</h2>
                <button onClick={() => setAdminView('employees')} className="text-slate-500 hover:text-slate-800"><X className="h-6 w-6" /></button>
            </div>
            <form onSubmit={e => {e.preventDefault(); onSave(user.uid, { name, points: Number(points) })}} className="space-y-4">
                <div><label className="block text-sm font-medium text-slate-700">Full Name</label>
                    <input type="text" value={name} onChange={e => setName(e.target.value)} className="mt-1 w-full form-input" required /></div>
                <div><label className="block text-sm font-medium text-slate-700">Pinn Points</label>
                    <input type="number" value={points} onChange={e => setPoints(e.target.value)} className="mt-1 w-full form-input" required /></div>
                <div className="flex justify-end space-x-3 pt-4">
                    <button type="button" onClick={() => setAdminView('employees')} className="px-4 py-2 rounded-lg bg-slate-200 hover:bg-slate-300">Cancel</button>
                    <button type="submit" className="px-4 py-2 rounded-lg bg-primary text-white hover:bg-primary-dark">Save Changes</button>
                </div>
            </form>
        </div>
    );
};

// --- Add custom styles ---
(function() {
    if (!document.getElementById('app-custom-styles')) {
        const style = document.createElement('style');
        style.id = 'app-custom-styles';
        style.textContent = `
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
          
          :root {
            --color-primary: #4f46e5;
            --color-primary-light: #e0e7ff;
            --color-primary-dark: #3730a3;
          }

          body { font-family: 'Inter', sans-serif; }
          
          .bg-primary { background-color: var(--color-primary); }
          .bg-primary-light { background-color: var(--color-primary-light); }
          .bg-primary-dark { background-color: var(--color-primary-dark); }
          .text-primary { color: var(--color-primary); }
          .text-primary-dark { color: var(--color-primary-dark); }
          .hover\\:bg-primary-dark:hover { background-color: var(--color-primary-dark); }
          .hover\\:text-primary:hover { color: var(--color-primary); }
          .border-primary { border-color: var(--color-primary); }
          .hover\\:bg-primary\\/20:hover { background-color: color-mix(in srgb, var(--color-primary) 20%, transparent); }

          .form-input {
             display: block; width: 100%; padding: 0.5rem 0.75rem;
             background-color: #f8fafc; border: 1px solid #cbd5e1;
             border-radius: 0.375rem; font-size: 0.875rem;
             box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05);
             transition: border-color .15s ease-in-out,box-shadow .15s ease-in-out;
          }

          .form-input:focus {
             outline: 2px solid transparent; outline-offset: 2px;
             border-color: var(--color-primary);
             box-shadow: 0 0 0 1px var(--color-primary);
          }
          
          @keyframes fade-down { 0% { opacity: 0; transform: translateY(-20px); } 100% { opacity: 1; transform: translateY(0); } }
          @keyframes fade-in { 0% { opacity: 0; } 100% { opacity: 1; } }
          
          .animate-fade-down { animation: fade-down 0.5s ease-out forwards; }
          .animate-fade-in { animation: fade-in 0.2s ease-out forwards; }
        `;
        document.head.appendChild(style);
    }
})();
