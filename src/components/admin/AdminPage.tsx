@@ .. @@
  const [showEmailConfig, setShowEmailConfig] = useState(false);
  const [showCannedResponses, setShowCannedResponses] = useState(false);
  
  // Filter states
  const [userFilter, setUserFilter] = useState('');
  const [userStatusFilter, setUserStatusFilter] = useState('all');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('pending');
  const [supportStatusFilter, setSupportStatusFilter] = useState('open');
  const [dateRange, setDateRange] = useState('7d');
  const [stats, setStats] = useState<any>({});

  useEffect(() => {
    if (user?.isAdmin) {
      loadAdminData();
    }
  }, [user]);

  const loadAdminData = async () => {
    try {
      setLoading(true);
      
      // Load all necessary data with error handling
      try {
        const usersData = await AdminUserService.getAllUsers();
        setUsers(usersData);
      } catch (err) {
        console.error('Error loading users:', err);
        setUsers([]);
      }
      
      try {
        const paymentsData = await ManualPaymentService.getAllPayments();
        setPendingPayments(paymentsData);
      } catch (err) {
        console.error('Error loading payments:', err);
        setPendingPayments([]);
      }
      
      try {
        const messages = await SupportService.getAllSupportMessages();
        setSupportMessages(messages);
      } catch (err) {
        console.error('Error loading support messages:', err);
        setSupportMessages([]);
      }
      
      // Load system stats after data is available
      await loadSystemStats();
      await loadRecentActivity();
      
    } catch (err) {
      console.error('Error loading admin data:', err);
      error('Load Failed', 'Failed to load some admin data');
    } finally {
      setLoading(false);
    }
  };

  const loadSystemStats = async () => {
    try {
      // Load various system statistics
      const stats = {
        totalUsers: users.length,
        activeUsers: users.filter(u => !u.isBlocked).length,
        totalRevenue: 0,
        pendingPayments: pendingPayments.length,
        openTickets: supportMessages.filter(m => m.status === 'open').length,
        systemHealth: 'healthy'
      };

      // Load financial stats
      try {
        const profitDoc = await getDoc(doc(db, 'system', 'profit_tracking'));
        if (profitDoc.exists()) {
          const profitData = profitDoc.data();
          stats.totalRevenue = profitData.totalProfit || 0;
          stats.totalDaisySpent = profitData.totalDaisySpent || 0;
          stats.totalUserCharged = profitData.totalUserCharged || 0;
          stats.totalRentals = profitData.totalRentals || 0;
        }
      } catch (err) {
        console.warn('Could not load profit tracking:', err);
      }

      setSystemStats(stats);
    } catch (err) {
      console.error('Error loading system stats:', err);
      setSystemStats({});
    }
  };