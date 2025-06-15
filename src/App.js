import React, { useState, useEffect, useRef } from 'react';
import { X, ShoppingCart, User, LogOut, PlusCircle, Edit, Trash2, Upload, DollarSign, Download, Users, Package, MinusCircle, Trash, CheckCircle, XCircle, Bell, KeyRound, Settings } from 'lucide-react';

// Note: The 'xlsx' library is loaded via a script tag at the end of this file.

// --- MOCK DATA ---
const initialUsers = {
  'admin': { password: 'Pinnacle2024!', role: 'admin', name: 'Admin User', notifications: [], requiresPasswordChange: false },
  'employee1': { password: 'password123', role: 'employee', name: 'Alex Reyes', points: 1500, notifications: [], requiresPasswordChange: false },
  'employee2': { password: 'password', role: 'employee', name: 'Bea Santos', points: 800, notifications: [], requiresPasswordChange: true },
  'employee3': { password: 'password456', role: 'employee', name: 'Chris David', points: 2500, notifications: [], requiresPasswordChange: false },
};

const initialInventory = [
  { id: 1, name: 'Company Tumbler', points: 500, stock: 10, image: 'https://placehold.co/400x400/e2e8f0/4a5568?text=Tumbler' },
  { id: 2, name: 'Branded Hoodie', points: 1200, stock: 5, image: 'https://placehold.co/400x400/e2e8f0/4a5568?text=Hoodie' },
  { id: 3, name: 'Wireless Mouse', points: 800, stock: 15, image: 'https://placehold.co/400x400/e2e8f0/4a5568?text=Mouse' },
  { id: 4, name: 'Pinnacle Notebook Set', points: 350, stock: 20, image: 'https://placehold.co/400x400/e2e8f0/4a5568?text=Notebook' },
];

const themes = {
  indigo: { name: 'Default Indigo', primary: '#4f46e5', light: '#e0e7ff', dark: '#3730a3' },
  sky: { name: 'Sky Blue', primary: '#0ea5e9', light: '#e0f2fe', dark: '#0369a1' },
  emerald: { name: 'Emerald Green', primary: '#10b981', light: '#d1fae5', dark: '#047857' },
  rose: { name: 'Rose Pink', primary: '#f43f5e', light: '#ffe4e6', dark: '#be123c' },
  amber: { name: 'Amber Orange', primary: '#f59e0b', light: '#fef3c7', dark: '#b45309' },
  fuchsia: { name: 'Fuchsia Purple', primary: '#d946ef', light: '#f5d0fe', dark: '#a21caf' },
  teal: { name: 'Teal', primary: '#14b8a6', light: '#ccfbf1', dark: '#0f766e' },
  slate: { name: 'Cool Slate', primary: '#64748b', light: '#e2e8f0', dark: '#334155' },
  lime: { name: 'Lime Green', primary: '#84cc16', light: '#ecfccb', dark: '#4d7c0f' },
  violet: { name: 'Deep Violet', primary: '#7c3aed', light: '#e9d5ff', dark: '#5b21b6' },
};

// --- MAIN APP COMPONENT ---
export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [view, setView] = useState('login'); // login, store, admin, forceChangePassword
  const [users, setUsers] = useState(initialUsers);
  const [inventory, setInventory] = useState(initialInventory);
  const [pendingOrders, setPendingOrders] = useState([]);
  const [notification, setNotification] = useState({ show: false, message: '', type: 'success' });
  const [appSettings, setAppSettings] = useState({
      logo: 'https://img.icons8.com/plasticine/100/like-us.png',
      theme: 'indigo'
  });

  useEffect(() => {
    const root = document.documentElement;
    const theme = themes[appSettings.theme];
    root.style.setProperty('--color-primary', theme.primary);
    root.style.setProperty('--color-primary-light', theme.light);
    root.style.setProperty('--color-primary-dark', theme.dark);
  }, [appSettings.theme]);

  const showNotification = (message, type = 'success', duration = 3000) => {
    setNotification({ show: true, message, type });
    setTimeout(() => {
      setNotification({ show: false, message: '', type: 'success' });
    }, duration);
  };

  const addNotification = (username, message, type) => {
    const newNotification = {
        id: Date.now(),
        message,
        type,
        timestamp: new Date().toISOString(),
        read: false
    };
    setUsers(prev => {
        const user = prev[username];
        if (!user) return prev;
        const newNotifications = [newNotification, ...user.notifications].slice(0, 20);
        return {
            ...prev,
            [username]: { ...user, notifications: newNotifications }
        };
    });
  };

  const handleLogin = (username, password) => {
    const user = users[username];
    if (user && user.password === password) {
      const userWithUsername = { username, ...user };
      setCurrentUser(userWithUsername);
      
      if (user.requiresPasswordChange) {
        setView('forceChangePassword');
        showNotification('Please update your password before proceeding.', 'info', 5000);
      } else {
        setView(user.role === 'admin' ? 'admin' : 'store');
        showNotification(`Welcome, ${user.name}!`);
        const unreadCount = user.notifications.filter(n => !n.read).length;
        if (user.role === 'employee' && unreadCount > 0) {
            setTimeout(() => {
                showNotification(`You have ${unreadCount} new notification(s).`, 'info', 5000);
            }, 1000);
        }
      }
    } else {
      showNotification('Invalid username or password.', 'error');
    }
  };

  const handleChangePassword = (newPassword) => {
    const updatedUser = { 
        ...currentUser, 
        password: newPassword, 
        requiresPasswordChange: false 
    };
    
    setCurrentUser(updatedUser);
    setUsers(prev => ({ ...prev, [currentUser.username]: updatedUser }));
    setView(updatedUser.role === 'admin' ? 'admin' : 'store');
    showNotification('Password updated successfully!', 'success');
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setView('login');
  };
  
  const executePurchase = (employeeUsername, cart, isApproval = false) => {
     const employee = users[employeeUsername];
     const totalCost = cart.reduce((sum, item) => sum + (item.points * item.quantity), 0);
     
     if (employee.points >= totalCost) {
        const updatedPoints = employee.points - totalCost;
        
        let updatedUsers = { ...users };
        updatedUsers[employeeUsername] = { ...employee, points: updatedPoints };

        if (isApproval) {
            const purchasedItems = cart.map(item => `${item.name} (x${item.quantity})`).join(', ');
            addNotification(employeeUsername, `Your purchase request for ${purchasedItems} has been approved.`, 'success');
        }

        setUsers(updatedUsers);

        setInventory(prevInventory => {
            const newInventory = [...prevInventory];
            cart.forEach(cartItem => {
                const itemIndex = newInventory.findIndex(invItem => invItem.id === cartItem.id);
                if (itemIndex !== -1) {
                    newInventory[itemIndex].stock -= cartItem.quantity;
                }
            });
            return newInventory;
        });
        
        const purchasedItems = cart.map(item => `${item.name} (x${item.quantity})`).join(', ');
        const notificationTarget = currentUser?.role === 'admin' ? `Admin Checkout for ${employee.name}` : `Employee: ${employee.name} (${employeeUsername})`;
        console.log(`%c--- PURCHASE NOTIFICATION ---
          To: harry.timosa@pinintel.com
          From: Pinnacle Rewards System
          Subject: Purchase Approved / Completed
          
          By: ${notificationTarget}
          Items: ${purchasedItems}
          Total Points Cost: ${totalCost}
          --- END NOTIFICATION ---`, "color: #4ade80; font-weight: bold;");

        return { success: true, updatedPoints };
     }
     return { success: false };
  };

  const handlePurchaseRequest = (cart) => {
    const newOrder = {
        orderId: Date.now(),
        employeeUsername: currentUser.username,
        cart: cart,
        status: 'pending'
    };
    setPendingOrders(prev => [...prev, newOrder]);
    showNotification(`Purchase request sent for admin approval.`, 'success');
    console.log(`%c--- NEW PURCHASE REQUEST ---
      To: harry.timosa@pinintel.com
      From: Pinnacle Rewards System
      Subject: New Purchase Request
      
      Employee: ${currentUser.name} (${currentUser.username})
      Items: ${cart.map(item => `${item.name} (x${item.quantity})`).join(', ')}
      --- END NOTIFICATION ---`, "color: #f59e0b; font-weight: bold;");
    return true;
  };

  const renderContent = () => {
    switch (view) {
      case 'login':
        return <LoginPage onLogin={handleLogin} logo={appSettings.logo} />;
      case 'forceChangePassword':
        return <ChangePasswordModal user={currentUser} onPasswordChange={handleChangePassword} />;
      case 'store':
        return <StorePage 
            user={currentUser}
            setUser={setCurrentUser}
            users={users}
            setUsers={setUsers}
            inventory={inventory} 
            onPurchaseRequest={handlePurchaseRequest} 
            onLogout={handleLogout} 
            showNotification={showNotification} 
            appSettings={appSettings}
        />;
      case 'admin':
        return <AdminDashboard 
                 user={currentUser} 
                 onLogout={handleLogout} 
                 inventory={inventory}
                 setInventory={setInventory}
                 users={users}
                 setUsers={setUsers}
                 showNotification={showNotification}
                 executePurchase={executePurchase}
                 pendingOrders={pendingOrders}
                 setPendingOrders={setPendingOrders}
                 addNotification={addNotification}
                 appSettings={appSettings}
                 setAppSettings={setAppSettings}
               />;
      default:
        return <LoginPage onLogin={handleLogin} />;
    }
  };

  return (
    <div className="bg-slate-100 min-h-screen font-sans">
      {notification.show && <NotificationBanner message={notification.message} type={notification.type} />}
      {renderContent()}
    </div>
  );
}

// --- SUB-COMPONENTS ---

const NotificationBanner = ({ message, type }) => {
  const baseStyle = 'bg-green-500';
  let styleType = baseStyle;
  if (type === 'error') styleType = 'bg-red-500';
  if (type === 'warning') styleType = 'bg-amber-500';
  if (type === 'info') styleType = 'bg-blue-500';
  
  return (
    <div className={`fixed top-0 left-0 right-0 p-4 text-white text-center z-[100] ${styleType} animate-fade-down`}>
      {message}
    </div>
  );
};

const LoginPage = ({ onLogin, logo }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    onLogin(username, password);
  };

  return (
    <div className="flex items-center justify-center min-h-screen px-4">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-xl shadow-lg">
        <div className="text-center">
        <img src={logo} alt="Company Logo" className="mx-auto h-20 w-auto mb-4 object-contain"/>
          <h1 className="text-3xl font-bold text-slate-800">Care Rewards</h1>
          <p className="mt-2 text-slate-500">Employee Store Login</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-700">Username</label>
            <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} className="mt-1 block w-full form-input" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1 block w-full form-input" required />
          </div>
          <button type="submit" className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-dark transition-colors">
            Login
          </button>
        </form>
      </div>
    </div>
  );
};

const Header = ({ user, onLogout, isAdmin, cartItemCount, onCartClick, appSettings }) => (
  <header className="bg-white shadow-md sticky top-0 z-40">
    <div className="container mx-auto px-4 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between h-16">
        <div className="flex items-center space-x-4">
           <img src={appSettings.logo} alt="Company Logo" className="h-10 w-auto object-contain"/>
           <span className="text-xl font-bold text-slate-700">Care Rewards</span>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <User className="h-5 w-5 text-slate-500" />
            <span className="text-sm font-medium text-slate-700">{user.name}</span>
          </div>
          {!isAdmin && (
            <>
            <div className="flex items-center space-x-2 bg-amber-100 text-amber-800 px-3 py-1 rounded-full">
              <DollarSign className="h-5 w-5" />
              <span className="text-sm font-bold">{user.points} Pinn Points</span>
            </div>
            <button onClick={onCartClick} className="relative text-slate-600 hover:text-primary transition-colors p-2">
                <ShoppingCart className="h-6 w-6"/>
                {cartItemCount > 0 && 
                    <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-red-100 bg-red-600 rounded-full transform translate-x-1/2 -translate-y-1/2">
                        {cartItemCount}
                    </span>
                }
            </button>
            </>
          )}
          <button onClick={onLogout} className="flex items-center space-x-2 text-slate-600 hover:text-primary transition-colors">
            <LogOut className="h-5 w-5" />
            <span className="text-sm font-medium">Logout</span>
          </button>
        </div>
      </div>
    </div>
  </header>
);

const StorePage = ({ user, setUser, users, setUsers, inventory, onPurchaseRequest, onLogout, showNotification, appSettings }) => {
  const [cart, setCart] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [storeView, setStoreView] = useState('store'); // store, notifications
  
  const unreadCount = user.notifications.filter(n => !n.read).length;

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

  const handleUpdateCartQuantity = (itemId, newQuantity) => {
    const item = inventory.find(i => i.id === parseInt(itemId));
    if (newQuantity <= 0) {
        setCart(cart.filter(cartItem => cartItem.id !== itemId));
    } else if (item.stock >= newQuantity) {
        setCart(cart.map(cartItem => cartItem.id === itemId ? { ...cartItem, quantity: newQuantity } : cartItem));
    } else {
        showNotification(`Only ${item.stock} of ${item.name} available.`, 'warning');
        setCart(cart.map(cartItem => cartItem.id === itemId ? { ...cartItem, quantity: item.stock } : cartItem));
    }
  };

  const handleConfirmRequest = () => {
    if (onPurchaseRequest(cart)) {
        setCart([]);
        setIsCartOpen(false);
    }
  };
  
  const handleViewNotifications = () => {
    setStoreView('notifications');
    const updatedUser = {
        ...user,
        notifications: user.notifications.map(n => ({...n, read: true}))
    };
    setUser(updatedUser);
    setUsers({ ...users, [user.username]: updatedUser });
  };

  const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  
  return (
    <>
      <Header user={user} onLogout={onLogout} cartItemCount={cartItemCount} onCartClick={() => setIsCartOpen(true)} appSettings={appSettings}/>
      <main className="container mx-auto p-4 sm:p-6 lg:p-8">
        <div className="flex items-center justify-between mb-6 border-b pb-4">
           <h2 className="text-3xl font-bold text-slate-800">
               {storeView === 'store' ? 'Store Items' : 'Notifications'}
           </h2>
           <div className="flex space-x-1 bg-slate-200 p-1 rounded-lg">
                <button onClick={() => setStoreView('store')} className={`px-3 py-2 text-sm font-medium rounded-md flex items-center gap-2 ${storeView === 'store' ? 'bg-white shadow' : 'text-slate-600 hover:bg-slate-300'}`}>
                    <Package size={16}/> Store
                </button>
                <button onClick={handleViewNotifications} className={`px-3 py-2 text-sm font-medium rounded-md flex items-center gap-2 relative ${storeView === 'notifications' ? 'bg-white shadow' : 'text-slate-600 hover:bg-slate-300'}`}>
                    <Bell size={16}/> Notifications
                    {unreadCount > 0 && <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-xs text-white">{unreadCount}</span>}
                </button>
           </div>
        </div>

        {storeView === 'store' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {inventory.filter(item => item.stock > 0).map(item => (
                <div key={item.id} className="bg-white rounded-xl shadow-lg overflow-hidden flex flex-col transition-transform hover:scale-105">
                  <img src={item.image} alt={item.name} className="w-full h-48 object-cover" onError={(e) => { e.target.onerror = null; e.target.src='https://placehold.co/400x400/e2e8f0/4a5568?text=Image+Error'; }}/>
                  <div className="p-4 flex flex-col flex-grow">
                    <h3 className="text-lg font-bold text-slate-800">{item.name}</h3>
                    <p className="text-sm text-slate-500 mt-1">In stock: {item.stock}</p>
                    <div className="mt-4 mb-2 flex-grow">
                       <p className="text-xl font-semibold text-primary">{item.points} Pinn Points</p>
                    </div>
                    <button onClick={() => handleAddToCart(item)} className="w-full mt-auto flex items-center justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-dark transition-colors">
                      <PlusCircle className="h-4 w-4 mr-2"/> Add to Cart
                    </button>
                  </div>
                </div>
              ))}
            </div>
        ) : (
            <NotificationList notifications={user.notifications} />
        )}
      </main>
      <CartModal 
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cart={cart}
        onUpdateQuantity={handleUpdateCartQuantity}
        onConfirmPurchase={handleConfirmRequest}
        userPoints={user.points}
      />
    </>
  );
};


const NotificationList = ({ notifications }) => {
    return (
        <div className="bg-white p-6 rounded-xl shadow-lg max-w-4xl mx-auto">
            <div className="space-y-4">
                {notifications.length === 0 ? (
                    <p className="text-slate-500 text-center py-8">You have no notifications.</p>
                ) : (
                    notifications.map(n => (
                        <div key={n.id} className={`p-4 rounded-lg flex items-start gap-4 ${n.type === 'success' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'} border`}>
                            <div>
                                {n.type === 'success' ? <CheckCircle className="text-green-500 mt-1"/> : <XCircle className="text-red-500 mt-1"/>}
                            </div>
                            <div>
                                <p className="font-medium text-slate-800">{n.message}</p>
                                <p className="text-xs text-slate-500">{new Date(n.timestamp).toLocaleString()}</p>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};


const CartModal = ({ isOpen, onClose, cart, onUpdateQuantity, onConfirmPurchase, userPoints }) => {
    if (!isOpen) return null;

    const totalCost = cart.reduce((sum, item) => sum + (item.points * item.quantity), 0);
    const canAfford = userPoints >= totalCost;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4 animate-fade-in">
            <div className="bg-white p-6 rounded-lg shadow-2xl w-full max-w-lg">
                <div className="flex justify-between items-center mb-4 border-b pb-4">
                   <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2"><ShoppingCart /> Your Cart</h2>
                   <button onClick={onClose} className="text-slate-500 hover:text-slate-800 p-1 rounded-full hover:bg-slate-100"><X className="h-6 w-6" /></button>
                </div>

                <div className="space-y-3 mb-4 max-h-72 overflow-y-auto pr-2">
                    {cart.length === 0 ? <p className="text-slate-500 text-center text-sm py-8">Your cart is empty.</p> : 
                      cart.map(item => (
                        <div key={item.id} className="flex items-center justify-between text-sm p-2 bg-slate-50 rounded-lg">
                            <div className="flex items-center gap-3">
                                <img src={item.image} alt={item.name} className="h-12 w-12 rounded-md object-cover"/>
                                <div>
                                    <p className="font-semibold">{item.name}</p>
                                    <p className="text-slate-500">{item.points} pts each</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button onClick={() => onUpdateQuantity(item.id, item.quantity - 1)} className="p-1 rounded-full bg-slate-200 hover:bg-slate-300"><MinusCircle size={18}/></button>
                                <span className="w-6 text-center font-semibold">{item.quantity}</span>
                                <button onClick={() => onUpdateQuantity(item.id, item.quantity + 1)} className="p-1 rounded-full bg-slate-200 hover:bg-slate-300"><PlusCircle size={18}/></button>
                                <button onClick={() => onUpdateQuantity(item.id, 0)} className="p-1 text-red-500 hover:bg-red-100 rounded-full"><Trash size={18}/></button>
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
                        <div className="flex justify-end space-x-3 pt-6">
                            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg bg-slate-200 hover:bg-slate-300">Continue Shopping</button>
                            <button onClick={onConfirmPurchase} disabled={!canAfford} className="px-6 py-2 rounded-lg bg-primary text-white hover:bg-primary-dark disabled:bg-slate-400 disabled:cursor-not-allowed">
                                Request Purchase
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

const ChangePasswordModal = ({ user, onPasswordChange }) => {
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        if (newPassword.length < 6) {
            setError('Password must be at least 6 characters long.');
            return;
        }
        if (newPassword !== confirmPassword) {
            setError('Passwords do not match.');
            return;
        }
        onPasswordChange(newPassword);
    };

    return (
        <div className="fixed inset-0 bg-slate-100 z-50 flex justify-center items-center p-4">
            <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-xl shadow-lg">
                <div className="text-center">
                    <h2 className="text-2xl font-bold text-slate-800">Update Your Password</h2>
                    <p className="mt-2 text-slate-500">For security, please create a new password.</p>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700">New Password</label>
                        <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="mt-1 w-full form-input" required />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700">Confirm New Password</label>
                        <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="mt-1 w-full form-input" required />
                    </div>
                    {error && <p className="text-sm text-red-600">{error}</p>}
                    <button type="submit" className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-dark">
                        Set New Password
                    </button>
                </form>
            </div>
        </div>
    );
};


const AdminDashboard = ({ user, onLogout, inventory, setInventory, users, setUsers, showNotification, executePurchase, pendingOrders, setPendingOrders, addNotification, appSettings, setAppSettings }) => {
  const [adminView, setAdminView] = useState('approvals'); // approvals, checkout, inventory, employees

  const renderAdminContent = () => {
    switch(adminView) {
      case 'inventory':
        return <InventoryManagement inventory={inventory} setInventory={setInventory} showNotification={showNotification} />;
      case 'employees':
        return <EmployeeManagement users={users} setUsers={setUsers} showNotification={showNotification} />;
      case 'checkout':
        return <CheckoutPOS users={users} inventory={inventory} executePurchase={executePurchase} showNotification={showNotification} />;
      case 'settings':
        return <AppSettingsPage appSettings={appSettings} setAppSettings={setAppSettings} showNotification={showNotification}/>;
      case 'approvals':
      default:
        return <ApprovalQueue pendingOrders={pendingOrders} setPendingOrders={setPendingOrders} users={users} executePurchase={executePurchase} showNotification={showNotification} addNotification={addNotification}/>;
    }
  }

  return (
    <>
      <Header user={user} onLogout={onLogout} isAdmin={true} appSettings={appSettings}/>
      <div className="container mx-auto p-4 sm:p-6 lg:p-8">
        <div className="flex items-center justify-between mb-6 border-b pb-4">
           <h2 className="text-3xl font-bold text-slate-800">Admin Dashboard</h2>
           <div className="flex space-x-1 bg-slate-200 p-1 rounded-lg">
                <button onClick={() => setAdminView('approvals')} className={`px-3 py-2 text-sm font-medium rounded-md flex items-center gap-2 relative ${adminView === 'approvals' ? 'bg-white shadow' : 'text-slate-600 hover:bg-slate-300'}`}>
                    <Bell size={16}/> Approvals
                    {pendingOrders.length > 0 && <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-xs text-white">{pendingOrders.length}</span>}
                </button>
              <button onClick={() => setAdminView('checkout')} className={`px-3 py-2 text-sm font-medium rounded-md flex items-center gap-2 ${adminView === 'checkout' ? 'bg-white shadow' : 'text-slate-600 hover:bg-slate-300'}`}><ShoppingCart size={16}/> Checkout</button>
              <button onClick={() => setAdminView('inventory')} className={`px-3 py-2 text-sm font-medium rounded-md flex items-center gap-2 ${adminView === 'inventory' ? 'bg-white shadow' : 'text-slate-600 hover:bg-slate-300'}`}><Package size={16}/> Inventory</button>
              <button onClick={() => setAdminView('employees')} className={`px-3 py-2 text-sm font-medium rounded-md flex items-center gap-2 ${adminView === 'employees' ? 'bg-white shadow' : 'text-slate-600 hover:bg-slate-300'}`}><Users size={16}/> Employees</button>
              <button onClick={() => setAdminView('settings')} className={`px-3 py-2 text-sm font-medium rounded-md flex items-center gap-2 ${adminView === 'settings' ? 'bg-white shadow' : 'text-slate-600 hover:bg-slate-300'}`}><Settings size={16}/> Settings</button>
           </div>
        </div>
        
        {renderAdminContent()}
      </div>
    </>
  );
};

const AppSettingsPage = ({ appSettings, setAppSettings, showNotification }) => {
    const fileInputRef = useRef(null);

    const handleLogoChange = (event) => {
        const file = event.target.files[0];
        if (!file) return;
        if (file.size > 2 * 1024 * 1024) { // 2MB limit
            showNotification('Image file is too large (max 2MB).', 'error');
            return;
        }
        const reader = new FileReader();
        reader.onloadend = () => {
            setAppSettings(prev => ({...prev, logo: reader.result}));
            showNotification('Logo updated successfully.', 'success');
        };
        reader.readAsDataURL(file);
    };

    const handleThemeChange = (themeKey) => {
        setAppSettings(prev => ({...prev, theme: themeKey}));
        showNotification(`Theme changed to ${themes[themeKey].name}.`, 'success');
    };

    return (
        <div className="bg-white p-6 rounded-xl shadow-lg max-w-4xl mx-auto">
            <h3 className="text-xl font-bold text-slate-700 mb-6">Application Settings</h3>
            <div className="space-y-8">
                {/* Logo Settings */}
                <div>
                    <h4 className="text-lg font-semibold text-slate-600 mb-2">Company Logo</h4>
                    <div className="flex items-center gap-4">
                       <img src={appSettings.logo} alt="Current Logo" className="h-16 w-auto p-2 border rounded-lg object-contain bg-slate-50"/>
                       <input type="file" ref={fileInputRef} onChange={handleLogoChange} className="hidden" accept="image/png, image/jpeg, image/gif"/>
                       <button type="button" onClick={() => fileInputRef.current.click()} className="px-4 py-2 rounded-lg bg-slate-200 hover:bg-slate-300 text-sm">
                           Upload New Logo
                       </button>
                    </div>
                </div>
                {/* Theme Settings */}
                <div>
                    <h4 className="text-lg font-semibold text-slate-600 mb-3">Color Theme</h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                        {Object.entries(themes).map(([key, theme]) => (
                            <button key={key} onClick={() => handleThemeChange(key)} className={`border-2 rounded-lg p-3 text-left ${appSettings.theme === key ? 'border-primary' : 'border-transparent'}`}>
                                <div className="flex gap-2">
                                    <div className="w-6 h-6 rounded-full" style={{backgroundColor: theme.primary}}></div>
                                    <div className="w-6 h-6 rounded-full" style={{backgroundColor: theme.light}}></div>
                                    <div className="w-6 h-6 rounded-full" style={{backgroundColor: theme.dark}}></div>
                                </div>
                                <p className="mt-2 text-sm font-medium text-slate-700">{theme.name}</p>
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};


const ApprovalQueue = ({ pendingOrders, setPendingOrders, users, executePurchase, showNotification, addNotification }) => {
    
    const handleApprove = (order) => {
        const result = executePurchase(order.employeeUsername, order.cart, true);
        if(result.success){
            showNotification(`Order #${order.orderId} for ${users[order.employeeUsername].name} approved.`, 'success');
            setPendingOrders(prev => prev.filter(o => o.orderId !== order.orderId));
        } else {
            showNotification(`Approval failed. ${users[order.employeeUsername].name} has insufficient points.`, 'error');
            addNotification(order.employeeUsername, `Your purchase request was denied due to insufficient points.`, 'error');
            setPendingOrders(prev => prev.filter(o => o.orderId !== order.orderId));
        }
    };
    
    const handleDeny = (order) => {
        const purchasedItems = order.cart.map(item => `${item.name} (x${item.quantity})`).join(', ');
        addNotification(order.employeeUsername, `Your purchase request for ${purchasedItems} has been denied by the admin.`, 'error');
        setPendingOrders(prev => prev.filter(o => o.orderId !== order.orderId));
        showNotification(`Order #${order.orderId} has been denied.`, 'warning');
    };

    return (
        <div className="bg-white p-6 rounded-xl shadow-lg">
            <h3 className="text-xl font-bold text-slate-700 mb-4">Pending Purchase Approvals</h3>
            {pendingOrders.length === 0 ? (
                <p className="text-slate-500 text-center py-8">No pending approvals.</p>
            ) : (
                <div className="space-y-4">
                    {pendingOrders.map(order => {
                        const employee = users[order.employeeUsername];
                        if (!employee) return null; // Failsafe if user was deleted
                        const totalCost = order.cart.reduce((sum, item) => sum + (item.points * item.quantity), 0);
                        const canAfford = employee.points >= totalCost;
                        return (
                        <div key={order.orderId} className="border rounded-lg p-4">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="font-bold text-lg">{employee.name}</p>
                                    <p className="text-sm text-slate-500">Order ID: {order.orderId}</p>
                                    <p className={`text-sm ${canAfford ? 'text-green-600' : 'text-red-600'}`}>
                                        Points: {employee.points} / Required: {totalCost}
                                    </p>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => handleApprove(order)} disabled={!canAfford} className="flex items-center gap-2 bg-green-500 text-white px-3 py-2 text-sm rounded-lg hover:bg-green-600 disabled:bg-slate-400">
                                        <CheckCircle size={16}/> Approve
                                    </button>
                                    <button onClick={() => handleDeny(order)} className="flex items-center gap-2 bg-red-500 text-white px-3 py-2 text-sm rounded-lg hover:bg-red-600">
                                        <XCircle size={16}/> Deny
                                    </button>
                                </div>
                            </div>
                            <div className="mt-4 border-t pt-4 space-y-2">
                                {order.cart.map(item => (
                                    <div key={item.id} className="flex justify-between items-center text-sm">
                                        <span>{item.name} (x{item.quantity})</span>
                                        <span>{item.points * item.quantity} pts</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )})}
                </div>
            )}
        </div>
    );
};

const CheckoutPOS = ({ users, inventory, executePurchase, showNotification }) => {
    const [selectedUser, setSelectedUser] = useState('');
    const [cart, setCart] = useState([]);
    
    const employeeList = Object.entries(users).filter(([_, user]) => user.role === 'employee');
    const availableItems = inventory.filter(item => item.stock > 0);
    const totalCost = cart.reduce((sum, item) => sum + (item.points * item.quantity), 0);
    const currentEmployee = users[selectedUser];

    const handleAddToCart = (itemId) => {
        const item = inventory.find(i => i.id === parseInt(itemId));
        if (!item) return;

        const itemInCart = cart.find(cartItem => cartItem.id === item.id);
        const currentQtyInCart = itemInCart ? itemInCart.quantity : 0;

        if (item.stock > currentQtyInCart) {
            if (itemInCart) {
                setCart(cart.map(cartItem => cartItem.id === item.id ? { ...cartItem, quantity: cartItem.quantity + 1 } : cartItem));
            } else {
                setCart([...cart, { ...item, quantity: 1 }]);
            }
        } else {
            showNotification(`Not enough stock for ${item.name}.`, 'warning');
        }
    };

    const handleUpdateQuantity = (itemId, newQuantity) => {
        const item = inventory.find(i => i.id === parseInt(itemId));
        if (newQuantity <= 0) {
            setCart(cart.filter(cartItem => cartItem.id !== itemId));
        } else if (item.stock >= newQuantity) {
            setCart(cart.map(cartItem => cartItem.id === itemId ? { ...cartItem, quantity: newQuantity } : cartItem));
        } else {
            showNotification(`Only ${item.stock} of ${item.name} available.`, 'warning');
            setCart(cart.map(cartItem => cartItem.id === itemId ? { ...cartItem, quantity: item.stock } : cartItem));
        }
    };
    
    const handleCheckout = () => {
        if (!currentEmployee) {
            showNotification('Please select an employee.', 'error');
            return;
        }
        if (cart.length === 0) {
            showNotification('Cart is empty.', 'error');
            return;
        }
        
        const result = executePurchase(selectedUser, cart);
        if (result.success) {
            showNotification(`Checkout successful for ${currentEmployee.name}!`, 'success');
            setCart([]);
        } else {
            showNotification(`${currentEmployee.name} does not have enough points (needs ${totalCost}).`, 'error');
        }
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2">
                <div className="bg-white p-6 rounded-xl shadow-lg">
                    <h3 className="text-xl font-bold text-slate-700 mb-4">Select Items</h3>
                    <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {availableItems.map(item => (
                            <div key={item.id} className="border rounded-lg p-3 flex flex-col items-center text-center">
                                <img src={item.image} alt={item.name} className="w-24 h-24 object-cover rounded-md mb-2" onError={(e) => { e.target.onerror = null; e.target.src='https://placehold.co/100x100/e2e8f0/4a5568?text=Item'; }}/>
                                <p className="font-semibold text-sm flex-grow">{item.name}</p>
                                <p className="text-xs text-slate-500 mb-2">{item.points} pts</p>
                                <button onClick={() => handleAddToCart(item.id)} className="w-full bg-primary-light text-primary-dark hover:bg-primary/20 text-xs font-bold py-2 px-2 rounded-md flex items-center justify-center gap-1">
                                    <PlusCircle size={14}/> Add
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="md:col-span-1">
                 <div className="bg-white p-6 rounded-xl shadow-lg sticky top-24">
                    <h3 className="text-xl font-bold text-slate-700 mb-4">Transaction</h3>
                     <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Employee</label>
                        <select value={selectedUser} onChange={e => {setSelectedUser(e.target.value); setCart([]);}} className="w-full form-input mb-4" required>
                            <option value="" disabled>-- Choose an employee --</option>
                            {employeeList.map(([username, user]) => (
                                <option key={username} value={username}>{user.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="space-y-2 mb-4 max-h-60 overflow-y-auto pr-2">
                        {cart.length === 0 ? <p className="text-slate-500 text-center text-sm py-4">Cart is empty</p> : 
                          cart.map(item => (
                            <div key={item.id} className="flex items-center justify-between text-sm">
                                <div>
                                    <p className="font-semibold">{item.name}</p>
                                    <p className="text-slate-500">{item.points} pts each</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button onClick={() => handleUpdateQuantity(item.id, item.quantity - 1)} className="p-1 rounded-full bg-slate-200 hover:bg-slate-300"><MinusCircle size={16}/></button>
                                    <span>{item.quantity}</span>
                                    <button onClick={() => handleUpdateQuantity(item.id, item.quantity + 1)} className="p-1 rounded-full bg-slate-200 hover:bg-slate-300"><PlusCircle size={16}/></button>
                                     <button onClick={() => handleUpdateQuantity(item.id, 0)} className="p-1 text-red-500 hover:bg-red-100 rounded-full"><Trash size={16}/></button>
                                </div>
                            </div>
                          ))
                        }
                    </div>

                    {currentEmployee && (
                        <div className="border-t pt-4 space-y-2 text-sm">
                            <div className="flex justify-between"><span>Current Points:</span> <span>{currentEmployee.points}</span></div>
                            <div className="flex justify-between font-semibold"><span>Total Cost:</span> <span>- {totalCost}</span></div>
                            <div className="flex justify-between font-bold text-lg text-primary border-t pt-2 mt-2"><span>Remaining:</span> <span>{currentEmployee.points - totalCost}</span></div>
                        </div>
                    )}
                    
                    <button onClick={handleCheckout} disabled={!selectedUser || cart.length === 0} className="w-full mt-4 flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-dark disabled:bg-slate-400 disabled:cursor-not-allowed">
                        Complete Checkout
                    </button>
                 </div>
            </div>
        </div>
    );
}

const InventoryManagement = ({ inventory, setInventory, showNotification }) => {
    const [showModal, setShowModal] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    
    const handleAddItem = () => {
        setEditingItem(null);
        setShowModal(true);
    };

    const handleEditItem = (item) => {
        setEditingItem(item);
        setShowModal(true);
    };

    const handleDeleteItem = (itemId) => {
        const isConfirmed = window.confirm("Are you sure you want to delete this item? This action cannot be undone.");
        if (isConfirmed) {
            setInventory(prev => prev.filter(item => item.id !== itemId));
            showNotification("Item deleted successfully.", "success");
        }
    };
    
    const handleSaveItem = (itemData) => {
        if (editingItem) {
            setInventory(prev => prev.map(item => item.id === editingItem.id ? { ...item, ...itemData } : item));
            showNotification("Item updated successfully.");
        } else {
            const newItem = { id: Date.now(), ...itemData };
            setInventory(prev => [...prev, newItem]);
            showNotification("Item added successfully.");
        }
        setShowModal(false);
    };
    
    return (
        <div className="bg-white p-6 rounded-xl shadow-lg">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-slate-700">Manage Inventory</h3>
                <button onClick={handleAddItem} className="flex items-center bg-primary text-white px-3 py-2 rounded-lg hover:bg-primary-dark transition-colors text-sm">
                    <PlusCircle className="h-4 w-4 mr-2" /> Add Item
                </button>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left text-slate-500">
                    <thead className="text-xs text-slate-700 uppercase bg-slate-50">
                        <tr>
                            <th scope="col" className="px-6 py-3">Image</th>
                            <th scope="col" className="px-6 py-3">Item Name</th>
                            <th scope="col" className="px-6 py-3">Points Cost</th>
                            <th scope="col" className="px-6 py-3">Stock</th>
                            <th scope="col" className="px-6 py-3 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {inventory.map(item => (
                            <tr key={item.id} className="bg-white border-b hover:bg-slate-50">
                                <td className="px-6 py-4">
                                    <img src={item.image} alt={item.name} className="h-12 w-12 rounded-md object-cover" onError={(e) => { e.target.onerror = null; e.target.src='https://placehold.co/100x100/e2e8f0/4a5568?text=Err'; }}/>
                                </td>
                                <th scope="row" className="px-6 py-4 font-medium text-slate-900 whitespace-nowrap">{item.name}</th>
                                <td className="px-6 py-4">{item.points}</td>
                                <td className="px-6 py-4">{item.stock}</td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex justify-end space-x-2">
                                      <button onClick={() => handleEditItem(item)} className="p-2 text-blue-600 hover:bg-blue-100 rounded-full"><Edit className="h-5 w-5"/></button>
                                      <button onClick={() => handleDeleteItem(item.id)} className="p-2 text-red-600 hover:bg-red-100 rounded-full"><Trash2 className="h-5 w-5"/></button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {showModal && <ItemModal item={editingItem} onClose={() => setShowModal(false)} onSave={handleSaveItem} showNotification={showNotification} />}
        </div>
    );
};

const ItemModal = ({ item, onClose, onSave, showNotification }) => {
    const [name, setName] = useState(item?.name || '');
    const [points, setPoints] = useState(item?.points || '');
    const [stock, setStock] = useState(item?.stock || '');
    const [image, setImage] = useState(item?.image || '');
    const fileInputRef = useRef(null);

    const handleFileChange = (event) => {
        const file = event.target.files[0];
        if (!file) return;

        if (file.size > 2 * 1024 * 1024) { // 2MB limit
            showNotification('Image file is too large (max 2MB).', 'error');
            return;
        }

        const reader = new FileReader();
        reader.onloadend = () => {
            setImage(reader.result);
        };
        reader.readAsDataURL(file);
    };
    
    const handleSubmit = (e) => {
        e.preventDefault();
        onSave({ name, points: Number(points), stock: Number(stock), image });
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4">
            <div className="bg-white p-8 rounded-lg shadow-2xl w-full max-w-md">
                <div className="flex justify-between items-center mb-6">
                   <h2 className="text-2xl font-bold text-slate-800">{item ? 'Edit Item' : 'Add New Item'}</h2>
                   <button onClick={onClose} className="text-slate-500 hover:text-slate-800"><X className="h-6 w-6" /></button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700">Item Name</label>
                        <input type="text" value={name} onChange={e => setName(e.target.value)} className="mt-1 w-full form-input" required />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700">Points Cost</label>
                        <input type="number" value={points} onChange={e => setPoints(e.target.value)} className="mt-1 w-full form-input" required />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700">Stock</label>
                        <input type="number" value={stock} onChange={e => setStock(e.target.value)} className="mt-1 w-full form-input" required />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700">Image</label>
                        <div className="mt-1 flex items-center gap-4">
                           <img 
                            src={image || 'https://placehold.co/100x100/e2e8f0/4a5568?text=No+Image'} 
                            alt="Preview" 
                            className="h-20 w-20 rounded-md object-cover bg-slate-100"
                           />
                           <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/png, image/jpeg, image/gif"/>
                           <button type="button" onClick={() => fileInputRef.current.click()} className="px-4 py-2 rounded-lg bg-slate-200 hover:bg-slate-300 text-sm">
                                Upload Picture
                           </button>
                        </div>
                    </div>
                    <div className="flex justify-end space-x-3 pt-4">
                        <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg bg-slate-200 hover:bg-slate-300">Cancel</button>
                        <button type="submit" className="px-4 py-2 rounded-lg bg-primary text-white hover:bg-primary-dark">Save Item</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const EmployeeManagement = ({ users, setUsers, showNotification }) => {
    const addPointsFileInputRef = useRef(null);
    const updateListFileInputRef = useRef(null);
    const [editingUser, setEditingUser] = useState(null);
    
    const handleSaveUser = (username, userData) => {
        setUsers(prev => ({
            ...prev,
            [username]: { ...prev[username], ...userData }
        }));
        showNotification(`${userData.name}'s details updated successfully.`);
        setEditingUser(null);
    };
    
    const handleResetPassword = (username) => {
        if(window.confirm(`Are you sure you want to reset the password for ${username}?`)) {
            setUsers(prev => ({
                ...prev,
                [username]: { ...prev[username], password: 'password', requiresPasswordChange: true }
            }));
            showNotification(`Password for ${username} has been reset to "password".`, 'success');
        }
    };

    const handleRemoveEmployee = (username) => {
        if(window.confirm(`Are you sure you want to remove employee "${username}"? This action cannot be undone.`)) {
            setUsers(prevUsers => {
                const newUsers = { ...prevUsers };
                delete newUsers[username];
                return newUsers;
            });
            showNotification(`Employee "${username}" has been removed.`, "success");
        }
    };

    const handleFileUpload = (event, mode) => {
        const file = event.target.files[0];
        if (!file || !window.XLSX) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const wb = window.XLSX.read(data, { type: 'array' });
                const ws = wb.Sheets[wb.SheetNames[0]];
                const json = window.XLSX.utils.sheet_to_json(ws);

                if (mode === 'addPoints') {
                    let updatedCount = 0;
                    setUsers(prevUsers => {
                        const newUsers = { ...prevUsers };
                        json.forEach(row => {
                           const username = row.username;
                           const pointsToAdd = row.points_to_add;
                           if(newUsers[username] && typeof pointsToAdd === 'number'){
                               newUsers[username].points += pointsToAdd;
                               updatedCount++;
                           }
                        });
                        return newUsers;
                    });
                     showNotification(`${updatedCount} employee(s) received points.`);
                } else { // 'updateList' mode
                    let updatedCount = 0;
                    let addedCount = 0;
                    setUsers(prevUsers => {
                        const newUsers = { ...prevUsers };
                        json.forEach(row => {
                            const r = Object.fromEntries(Object.entries(row).map(([k, v]) => [k.toLowerCase(), v]));
                            if (newUsers[r.username]) {
                                if(typeof r.points === 'number') newUsers[r.username].points = r.points;
                                if(r.name) newUsers[r.username].name = r.name;
                                if(r.password) newUsers[r.username].password = r.password;
                                updatedCount++;
                            } else if (r.username && r.name) {
                                newUsers[r.username] = {
                                    password: r.password || 'password',
                                    name: r.name,
                                    points: r.points || 0,
                                    role: r.role || 'employee',
                                    notifications: [],
                                    requiresPasswordChange: true
                                };
                                addedCount++;
                            }
                        });
                        return newUsers;
                    });
                    showNotification(`${updatedCount} employees updated, ${addedCount} employees added.`, 'success', 5000);
                }
            } catch (error) {
                console.error("Error parsing Excel file:", error);
                showNotification("Failed to parse file. Check format and column names.", "error");
            }
        };
        reader.readAsArrayBuffer(file);
        event.target.value = null; // Reset file input
    };

    const handleDownloadTemplate = (mode) => {
        if (!window.XLSX) { showNotification("Library not loaded, please wait.", "warning"); return; }
        
        let templateData, filename;
        if (mode === 'addPoints') {
            templateData = [{ username: 'employee1', points_to_add: 100 }];
            filename = "add_points_template.xlsx";
        } else {
            templateData = [{ username: 'new.employee', password: 'password', name: 'New Employee', points: 0, role: 'employee' }];
            filename = "employee_list_template.xlsx";
        }
        
        const ws = window.XLSX.utils.json_to_sheet(templateData);
        const wb = window.XLSX.utils.book_new();
        window.XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
        window.XLSX.writeFile(wb, filename);
    };


    const employeeList = Object.entries(users).filter(([_, user]) => user.role === 'employee');

    return (
        <div className="bg-white p-6 rounded-xl shadow-lg">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-slate-700">Manage Employees</h3>
                <div className="flex items-center gap-2">
                    <button onClick={() => handleDownloadTemplate('addPoints')} className="flex items-center bg-blue-500 text-white px-3 py-2 rounded-lg hover:bg-blue-600 transition-colors text-sm">
                        <Download className="h-4 w-4 mr-2" /> Add Pts Template
                    </button>
                    <input type="file" ref={addPointsFileInputRef} onChange={(e) => handleFileUpload(e, 'addPoints')} className="hidden" accept=".xlsx, .xls, .csv"/>
                    <button onClick={() => addPointsFileInputRef.current.click()} className="flex items-center bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm">
                        <Upload className="h-4 w-4 mr-2" /> Add Points
                    </button>

                    <button onClick={() => handleDownloadTemplate('updateList')} className="flex items-center bg-gray-600 text-white px-3 py-2 rounded-lg hover:bg-gray-700 transition-colors text-sm ml-4">
                        <Download className="h-4 w-4 mr-2" /> List Template
                    </button>
                    <input type="file" ref={updateListFileInputRef} onChange={(e) => handleFileUpload(e, 'updateList')} className="hidden" accept=".xlsx, .xls, .csv"/>
                    <button onClick={() => updateListFileInputRef.current.click()} className="flex items-center bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-700 transition-colors text-sm">
                        <Upload className="h-4 w-4 mr-2" /> Update List
                    </button>
                </div>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left text-slate-500">
                    <thead className="text-xs text-slate-700 uppercase bg-slate-50">
                        <tr>
                            <th scope="col" className="px-6 py-3">Employee Name</th>
                            <th scope="col" className="px-6 py-3">Username</th>
                            <th scope="col" className="px-6 py-3">Current Points</th>
                            <th scope="col" className="px-6 py-3 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {employeeList.map(([username, user]) => (
                            <tr key={username} className="bg-white border-b hover:bg-slate-50">
                                <th scope="row" className="px-6 py-4 font-medium text-slate-900 whitespace-nowrap">{user.name}</th>
                                <td className="px-6 py-4">{username}</td>
                                <td className="px-6 py-4">{user.points}</td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex justify-end space-x-2">
                                        <button onClick={() => handleResetPassword(username)} title="Reset Password" className="p-2 text-amber-600 hover:bg-amber-100 rounded-full"><KeyRound className="h-5 w-5"/></button>
                                        <button onClick={() => setEditingUser({username, ...user})} className="p-2 text-blue-600 hover:bg-blue-100 rounded-full"><Edit className="h-5 w-5"/></button>
                                        <button onClick={() => handleRemoveEmployee(username)} title={`Remove ${user.name}`} className="p-2 text-red-600 hover:bg-red-100 rounded-full"><Trash2 className="h-5 w-5"/></button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {editingUser && <EmployeeModal user={editingUser} onClose={() => setEditingUser(null)} onSave={handleSaveUser} />}
        </div>
    );
};

const EmployeeModal = ({ user, onClose, onSave }) => {
    const [name, setName] = useState(user.name);
    const [points, setPoints] = useState(user.points);
    const [password, setPassword] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        const userData = { name, points: Number(points) };
        if (password) {
            userData.password = password;
            userData.requiresPasswordChange = true;
        }
        onSave(user.username, userData);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
            <div className="bg-white p-8 rounded-lg shadow-2xl w-full max-w-md">
                <div className="flex justify-between items-center mb-6">
                   <h2 className="text-2xl font-bold text-slate-800">Edit Employee: {user.username}</h2>
                   <button onClick={onClose} className="text-slate-500 hover:text-slate-800"><X className="h-6 w-6" /></button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700">Full Name</label>
                        <input type="text" value={name} onChange={e => setName(e.target.value)} className="mt-1 w-full form-input" required />
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-slate-700">New Password (optional)</label>
                        <input type="text" value={password} onChange={e => setPassword(e.target.value)} placeholder="Leave blank to keep current password" className="mt-1 w-full form-input" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700">Pinn Points</label>
                        <input type="number" value={points} onChange={e => setPoints(e.target.value)} className="mt-1 w-full form-input" required />
                    </div>
                    <div className="flex justify-end space-x-3 pt-4">
                        <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg bg-slate-200 hover:bg-slate-300">Cancel</button>
                        <button type="submit" className="px-4 py-2 rounded-lg bg-primary text-white hover:bg-primary-dark">Save Changes</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// --- Add external scripts and custom styles ---
(function() {
    const loadScript = (src, id) => {
        if (document.getElementById(id)) return;
        const script = document.createElement('script');
        script.src = src;
        script.id = id;
        script.async = true;
        document.head.appendChild(script);
    };

    loadScript('https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js', 'xlsx-script');

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
          }

          .form-input:focus {
              outline: 2px solid transparent; outline-offset: 2px;
              --tw-ring-offset-shadow: var(--tw-ring-inset) 0 0 0 var(--tw-ring-offset-width) var(--tw-ring-offset-color);
              --tw-ring-shadow: var(--tw-ring-inset) 0 0 0 calc(1px + var(--tw-ring-offset-width)) var(--tw-ring-color);
              box-shadow: var(--tw-ring-offset-shadow), var(--tw-ring-shadow), var(--tw-shadow, 0 0 #0000);
              border-color: var(--color-primary);
          }
          
          @keyframes fade-down {
              0% { opacity: 0; transform: translateY(-20px); }
              100% { opacity: 1; transform: translateY(0); }
          }
          
          @keyframes fade-in {
              0% { opacity: 0; }
              100% { opacity: 1; }
          }

          .animate-fade-down { animation: fade-down 0.5s ease-out forwards; }
          .animate-fade-in { animation: fade-in 0.2s ease-out forwards; }
        `;
        document.head.appendChild(style);
    }
})();
