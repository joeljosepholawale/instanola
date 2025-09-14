import React, { useState, useEffect } from "react";
import {
  Smartphone,
  RefreshCw,
  CheckCircle,
  XCircle,
  MoreVertical,
  Heart,
  ChevronDown,
  Copy,
  X,
  Zap,
  Info,
} from "lucide-react";
import { Button } from "../../components/ui/Button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "../../components/ui/Card";
import { Loader } from "../../components/ui/Loader";
import { useAuth } from "../../hooks/useAuth";
import { useStatusPolling } from "../../hooks/useStatusPolling";
import { useToast } from "../../hooks/useToast";
import { DaisySMSService } from "../../services/daisySMS";
import { formatCurrency, formatDate } from "../../lib/utils";
import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  increment,
  setDoc,
  limit,
} from "firebase/firestore";
import { db } from "../../lib/firebase";

export function NumbersPage() {
  const { user } = useAuth();
  const { success, error } = useToast();

  // State management
  const [loading, setLoading] = useState(true);
  const [rentals, setRentals] = useState<any[]>([]);
  const [selectedCountry, setSelectedCountry] = useState("0"); // USA default
  const [selectedService, setSelectedService] = useState("");
  const [serviceInput, setServiceInput] = useState("");
  const [showServiceDropdown, setShowServiceDropdown] = useState(false);
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  const [renting, setRenting] = useState(false);
  const [balance, setBalance] = useState(0);
  const [pricing, setPricing] = useState<any>({});
  const [allServices, setAllServices] = useState<any[]>([]);
  const [showSMSText, setShowSMSText] = useState<string | null>(null);
  const [smsTextData, setSmsTextData] = useState<any>(null);
  const [displayCount, setDisplayCount] = useState(6);
  const [balanceRefreshKey, setBalanceRefreshKey] = useState(0);
  const [timers, setTimers] = useState<{ [key: string]: number }>({});
  const [markupPercentage, setMarkupPercentage] = useState(30);
  const [exchangeRate, setExchangeRate] = useState(1600);
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [initialTimers, setInitialTimers] = useState<{ [key: string]: number }>(
    {}
  );
  const [pricingLoaded, setPricingLoaded] = useState(false);

  // Cache for services to avoid repeated API calls
  const [servicesCache, setServicesCache] = useState<any[]>([]);
  const [servicesCacheTime, setServicesCacheTime] = useState<number>(0);
  const [servicesLoading, setServicesLoading] = useState(false);

  // Advanced options state
  const [areaCodes, setAreaCodes] = useState("");
  const [carriers, setCarriers] = useState("Any Carrier");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [isShortTerm, setIsShortTerm] = useState(true);
  const [durationValue, setDurationValue] = useState("1");
  const [durationUnit, setDurationUnit] = useState("Days");
  const [renewable, setRenewable] = useState(false);
  const [autoRenew, setAutoRenew] = useState(false);

  // Utility functions
  const getServiceName = (code: string): string => {
    const service = allServices.find((s) => s.code === code);
    return service ? service.name : code;
  };

  const getCountryName = (code: string): string => {
    const country = countries.find((c) => c.code === code);
    return country ? country.name : code;
  };

  // Define handleStatusUpdate before useStatusPolling
  const handleStatusUpdate = async (
    rentalId: string,
    statusData: { status: string; code?: string }
  ) => {
    try {
      await updateDoc(doc(db, "rentals", rentalId), {
        status: statusData.status,
        ...(statusData.code && { code: statusData.code }),
        lastChecked: new Date(),
      });

      setRentals((prev) =>
        prev.map((rental) =>
          rental.id === rentalId
            ? { ...rental, status: statusData.status, code: statusData.code }
            : rental
        )
      );

      if (statusData.code) {
        success("SMS Received!", `Code: ${statusData.code}`);
      }
    } catch (err) {
      console.error("Error updating rental status:", err);
    }
  };

  // Available services with emojis and real codes
  const availableServices = [
    { code: "wa", name: "WhatsApp", emoji: "💬", popular: true },
    { code: "vi", name: "Viber", emoji: "📞", popular: false },
    { code: "ot", name: "OpenAI ChatGPT", emoji: "🤖", popular: true },
    { code: "tg", name: "Telegram", emoji: "✈️", popular: true },
    { code: "ya", name: "Yahoo", emoji: "📧", popular: false },
    {
      code: "ma",
      name: "Microsoft Outlook Hotmail",
      emoji: "📨",
      popular: false,
    },
    { code: "fb", name: "Facebook", emoji: "📘", popular: true },
    { code: "cl", name: "Craigslist", emoji: "📋", popular: false },
    { code: "ds", name: "Discord", emoji: "🎮", popular: true },
  ];

  // Countries mapping with flags
  const countries = [
    { code: "0", name: "United States", flag: "🇺🇸" },
    { code: "1", name: "Russia", flag: "🇷🇺" },
    { code: "44", name: "United Kingdom", flag: "🇬🇧" },
    { code: "49", name: "Germany", flag: "🇩🇪" },
    { code: "33", name: "France", flag: "🇫🇷" },
    { code: "39", name: "Italy", flag: "🇮🇹" },
    { code: "34", name: "Spain", flag: "🇪🇸" },
    { code: "31", name: "Netherlands", flag: "🇳🇱" },
    { code: "48", name: "Poland", flag: "🇵🇱" },
    { code: "420", name: "Czech Republic", flag: "🇨🇿" },
  ];

  // Status polling for waiting rentals
  useStatusPolling({
    rentals: rentals.filter((r) => r.status === "waiting"),
    onStatusUpdate: handleStatusUpdate,
    enabled: true,
    interval: 3000,
  });

  useEffect(() => {
    if (user) {
      loadCriticalData();
      loadServicesInBackground();

      // Set up timer updates every 2 seconds (less frequent for better performance)
      const timerInterval = setInterval(() => {
        setTimers((prev) => {
          const newTimers = { ...prev };
          Object.keys(newTimers).forEach((rentalId) => {
            if (newTimers[rentalId] > 0) {
              newTimers[rentalId] -= 2; // Subtract 2 since we update every 2 seconds
            }
          });
          return newTimers;
        });
      }, 2000); // Update every 2 seconds instead of 1

      return () => clearInterval(timerInterval);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      loadRentals();
      setDisplayCount(6);

      // Update current time every 2 seconds for timer display (better performance)
      const timer = setInterval(() => {
        setCurrentTime(Date.now());
      }, 2000);

      return () => clearInterval(timer);
    }
  }, [user]);

  // Timer update effect (reduced frequency for better performance)
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 2000); // Update every 2 seconds instead of 1

    return () => clearInterval(interval);
  }, []);

  const loadCriticalData = async () => {
    console.log("🎯 loadCriticalData called - starting page data load");
    setLoading(true);
    
    // Load only essential data first for faster initial render
    try {
      console.log("📊 Loading critical data: balance, rentals, and markup...");
      await Promise.all([
        fetchBalance(),
        loadRentals(),
        loadMarkupPercentage()
      ]);
      console.log("✅ Critical data loaded successfully");
      setLoading(false); // Show UI as soon as possible
      
      // Load non-critical data in background
      await Promise.all([
        loadExchangeRate(),
        fetchPricing()
      ]);
      setPricingLoaded(true);
    } catch (error) {
      console.error('Error loading critical data:', error);
      setLoading(false);
    }
  };

  const loadServicesInBackground = async () => {
    // Check cache first (5 minute cache)
    const cacheAge = Date.now() - servicesCacheTime;
    if (servicesCache.length > 0 && cacheAge < 5 * 60 * 1000) {
      setAllServices(servicesCache);
      return;
    }

    setServicesLoading(true);

    // Set fallback services immediately
    const fallbackServices = [
      { code: "wa", name: "WhatsApp" },
      { code: "tg", name: "Telegram" },
      { code: "ig", name: "Instagram" },
      { code: "fb", name: "Facebook" },
      { code: "tw", name: "Twitter" },
      { code: "ds", name: "Discord" },
      { code: "go", name: "Google" },
      { code: "vi", name: "Viber" },
      { code: "ot", name: "Other" },
    ];

    setAllServices(fallbackServices);

    try {
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Service loading timeout")), 3000)
      );

      const servicesPromise = loadAllServices();

      await Promise.race([servicesPromise, timeoutPromise]);
    } catch (error) {
      console.log("Using fallback services due to timeout or error:", error);
    } finally {
      setServicesLoading(false);
    }
  };

  const fetchBalance = async () => {
    if (!user) return;
    try {
      const userDoc = await getDoc(doc(db, "users", user.id));
      if (userDoc.exists()) {
        setBalance(userDoc.data().walletBalance || 0);
        const userData = userDoc.data();
        const usdBalance = userData.walletBalance || 0;
        const ngnBalance = userData.walletBalanceNGN || 0;

        console.log("Refreshed balances:", { usdBalance, ngnBalance });

        setBalanceRefreshKey((prev) => prev + 1);
      }
    } catch (err) {
      console.error("Error fetching balance:", err);
    }
  };

  const fetchPricing = async () => {
    try {
      // Check cache first (cache for 10 minutes)
      const cacheKey = 'daisysms_pricing_cache';
      const cacheTimeKey = 'daisysms_pricing_cache_time';
      const cachedPricing = localStorage.getItem(cacheKey);
      const cacheTime = localStorage.getItem(cacheTimeKey);
      
      if (cachedPricing && cacheTime) {
        const age = Date.now() - parseInt(cacheTime);
        if (age < 10 * 60 * 1000) { // 10 minute cache
          const prices = JSON.parse(cachedPricing);
          setPricing(prices);
          setPricingLoaded(true);
          console.log("Using cached pricing data");
          return;
        }
      }
      
      console.log("Fetching fresh pricing data...");
      const daisyService = await DaisySMSService.createWithStoredKey();
      
      // Add timeout to prevent hanging
      const pricingPromise = daisyService.getPrices();
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Pricing fetch timeout')), 5000)
      );
      
      const prices = await Promise.race([pricingPromise, timeoutPromise]);
      
      // Cache the successful result
      localStorage.setItem(cacheKey, JSON.stringify(prices));
      localStorage.setItem(cacheTimeKey, Date.now().toString());
      
      console.log("Fresh pricing data received and cached");
      setPricing(prices);
      setPricingLoaded(true);
    } catch (err) {
      console.error("Error fetching pricing:", err);
      // Use fallback pricing data
      const fallbackPricing = {
        "0": {
          wa: { cost: "0.70", count: "50" },
          vi: { cost: "0.25", count: "30" },
          ot: { cost: "0.10", count: "20" },
          tg: { cost: "1.50", count: "40" },
          ya: { cost: "0.20", count: "25" },
          ma: { cost: "0.15", count: "35" },
          fb: { cost: "1.00", count: "15" },
          cl: { cost: "0.10", count: "10" },
          ds: { cost: "0.10", count: "45" },
        },
      };
      setPricing(fallbackPricing);
      setPricingLoaded(true);
      console.log("Using fallback pricing due to error");
    }
  };

  const loadMarkupPercentage = async () => {
    try {
      const pricingDoc = await getDoc(doc(db, "config", "pricing"));
      if (pricingDoc.exists()) {
        const pricingData = pricingDoc.data();
        const markup = pricingData.markupPercentage;
        if (typeof markup === "number" && markup >= 0 && markup <= 100) {
          setMarkupPercentage(markup);
        } else {
          setMarkupPercentage(30);
        }
      }
    } catch (err) {
      console.error("Error loading markup percentage:", err);
      setMarkupPercentage(30);
    }
  };

  const loadExchangeRate = async () => {
    try {
      const configDoc = await getDoc(doc(db, "config", "currency"));
      if (configDoc.exists()) {
        const configData = configDoc.data();
        setExchangeRate(configData.usdToNgnRate || 1600);
      }
    } catch (err) {
      console.error("Error loading exchange rate:", err);
      setExchangeRate(1600);
    }
  };

  const loadAllServices = async () => {
    try {
      // Check if we have cached services (5 minute cache)
      const cacheAge = Date.now() - servicesCacheTime;
      if (servicesCache.length > 0 && cacheAge < 5 * 60 * 1000) {
        setAllServices(servicesCache);
        return;
      }

      const daisyService = await DaisySMSService.createWithStoredKey();
      const services = await daisyService.getAllServices();

      // Cache the services
      setServicesCache(services);
      setServicesCacheTime(Date.now());
      setAllServices(services);

      console.log("Services loaded and cached:", services.length);
    } catch (err) {
      console.error("Error loading services:", err);
      if (allServices.length === 0) {
        const fallbackServices = [
          { code: "wa", name: "WhatsApp" },
          { code: "tg", name: "Telegram" },
          { code: "ig", name: "Instagram" },
          { code: "fb", name: "Facebook" },
          { code: "tw", name: "Twitter" },
          { code: "ds", name: "Discord" },
          { code: "go", name: "Google" },
          { code: "vi", name: "Viber" },
          { code: "ot", name: "Other" },
        ];
        setAllServices(fallbackServices);
      }
    }
  };

  const loadRentals = async () => {
    console.log("🔄 loadRentals called with user:", user?.id);
    if (!user) {
      console.log("❌ No user found, skipping rental load");
      return;
    }
    try {
      console.log("🚀 Starting loadRentals execution...");
      // Optimize query: limit to recent rentals for faster loading
      const rentalsQuery = query(
        collection(db, "rentals"),
        where("userId", "==", user.id),
        orderBy("createdAt", "desc"), // Order by creation date, newest first
        limit(20) // Only load latest 20 rentals for performance
      );
      const snapshot = await getDocs(rentalsQuery);
      console.log(`🔍 Firebase query returned ${snapshot.docs.length} documents for user ${user.id}`);
      
      // Log all documents found
      const allDocs = snapshot.docs.map(doc => ({
        id: doc.id,
        data: doc.data(),
        userId: doc.data().userId,
        status: doc.data().status
      }));
      console.log("🗂️ All rental documents from Firebase:", allDocs);
      
      const rentalData = snapshot.docs
        .map((doc) => ({
          id: doc.id,
          documentId: doc.id, // Keep track of document ID separately
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate() || new Date(),
          expiresAt: doc.data().expiresAt?.toDate() || new Date(),
        }))
        .filter((rental) => {
          // Hide cancelled rentals from the main view
          const keep = rental.status !== "cancelled";
          if (rental.status === "cancelled") {
            console.log(`🚫 Filtering out cancelled rental: ${rental.id} (created: ${rental.createdAt}, cancelled: ${rental.cancelledAt})`);
          }
          return keep;
        })
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        
      console.log("📋 Final processed rental data:", rentalData.map(r => ({
        id: r.id,
        status: r.status,
        userId: r.userId,
        number: r.number
      })));

      // Merge with existing rentals to avoid duplicates from optimistic UI updates
      setRentals(prevRentals => {
        const existingIds = new Set(prevRentals.map(r => r.id));
        const newRentals = rentalData.filter(r => !existingIds.has(r.id));
        const updatedRentals = [...newRentals, ...prevRentals];
        
        console.log("🔄 Merging rentals:", {
          previousCount: prevRentals.length,
          newFromFirebase: newRentals.length,
          totalAfterMerge: updatedRentals.length,
          duplicatesSkipped: rentalData.length - newRentals.length
        });
        
        return updatedRentals.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      });

      // Initialize timers for waiting rentals
      const newTimers: { [key: string]: number } = {};
      rentalData.forEach((rental) => {
        if (rental.status === "waiting" && rental.expiresAt) {
          const timeLeft = Math.max(
            0,
            Math.floor((rental.expiresAt.getTime() - Date.now()) / 1000)
          );
          newTimers[rental.id] = timeLeft;
        }
      });
      setTimers(newTimers);

      // Set initial timers for new rentals
      const timers: { [key: string]: number } = {};
      rentalData.forEach((rental) => {
        if (rental.status === "waiting" && !initialTimers[rental.id]) {
          timers[rental.id] = 418;
        }
      });
      setInitialTimers((prev) => ({ ...prev, ...timers }));
    } catch (err) {
      console.error("Error loading rentals:", err);
      setRentals([]);
    } finally {
      setLoading(false);
    }
  };

  const handleServiceSelect = (service: any) => {
    setSelectedService(service.code);
    setServiceInput(service.name);
    setShowServiceDropdown(false);
  };

  const getServicePrice = () => {
    console.log(
      "Getting service price for:",
      selectedService,
      "from pricing:",
      pricing
    );

    if (!selectedService) {
      return { price: 0, available: 0 };
    }

    const countryPricing =
      pricing[selectedCountry] ||
      pricing["0"] ||
      pricing["1"] ||
      pricing[Object.keys(pricing)[0]];
    console.log("Country pricing:", countryPricing);

    if (!countryPricing || !countryPricing[selectedService]) {
      console.log("No pricing found for service:", selectedService);
      return { price: 0.25, available: 50 };
    }

    const serviceData = countryPricing[selectedService];
    console.log("Service data:", serviceData);

    return {
      price: parseFloat(serviceData.cost || "0") * (1 + markupPercentage / 100),
      available: parseInt(serviceData.count || "0"),
    };
  };

  const getServicePriceForDropdown = (serviceCode: string) => {
    const countryPricing =
      pricing[selectedCountry] ||
      pricing["0"] ||
      pricing["1"] ||
      pricing[Object.keys(pricing)[0]];
    if (!countryPricing || !countryPricing[serviceCode]) {
      const fallbackPrice = 0.25;
      return fallbackPrice * (1 + markupPercentage / 100);
    }
    const basePrice = parseFloat(countryPricing[serviceCode].cost || "0");
    return basePrice * (1 + markupPercentage / 100);
  };

  const getCurrentPrice = (rental: any) => {
    if (!pricingLoaded || !pricing || Object.keys(pricing).length === 0) {
      return rental.userPrice || rental.actualPrice || 0.25;
    }

    const countryPricing =
      pricing[rental.countryCode] ||
      pricing["0"] ||
      pricing["1"] ||
      pricing[Object.keys(pricing)[0]];

    if (!countryPricing || !countryPricing[rental.serviceCode]) {
      const storedPrice = rental.userPrice || rental.actualPrice || 0;
      return storedPrice > 0 ? storedPrice : 0.25;
    }

    const basePrice = parseFloat(
      countryPricing[rental.serviceCode].cost || "0"
    );
    return basePrice * (1 + markupPercentage / 100);
  };

  const handleRentNumber = async () => {
    if (!user) return;

    // Prevent multiple simultaneous rental requests
    if (loading) {
      console.log("⚠️ Rental already in progress, ignoring duplicate request");
      return;
    }

    console.log("Starting number rental process...");
    console.log("Selected service:", selectedService);
    console.log("Selected country:", selectedCountry);
    console.log("User balance:", balance);

    if (!selectedService) {
      error("Service Required", "Please select a service first");
      return;
    }

    const { price, available } = getServicePrice();
    console.log("Service pricing - price:", price, "available:", available);

    // CRITICAL FIX: Get fresh balance before rental to prevent stale data issues
    console.log("Checking fresh balance before rental...");
    try {
      const userDoc = await getDoc(doc(db, "users", user.id));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const freshBalance = userData.walletBalance || 0;
        const freshBalanceNGN = userData.walletBalanceNGN || 0;
        const exchangeRate = 1600;
        
        console.log("Fresh balance check:", { freshBalance, freshBalanceNGN, requiredPrice: price });
        
        const hasUSDBalance = freshBalance >= price;
        const hasNGNBalance = freshBalanceNGN >= (price * exchangeRate);
        
        if (!hasUSDBalance && !hasNGNBalance) {
          const totalEquivalent = freshBalance + (freshBalanceNGN / exchangeRate);
          error(
            "Insufficient Balance",
            `You need ${formatCurrency(price)} to rent this number. Current balance: ${formatCurrency(totalEquivalent)} (USD: ${formatCurrency(freshBalance)}, NGN: ₦${freshBalanceNGN.toLocaleString()})`
          );
          return;
        }
        
        console.log("Fresh balance check passed, proceeding with rental");
      } else {
        error("User Error", "User account not found");
        return;
      }
    } catch (balanceError) {
      console.error("Error checking fresh balance:", balanceError);
      error("Balance Check Failed", "Could not verify balance. Please try again.");
      return;
    }

    if (available === 0) {
      error("Out of Stock", "No numbers available for this service");
      return;
    }

    let result: any = null;
    
    try {
      setRenting(true);
      console.log("🚀 Starting rental process with params:", {
        service: selectedService,
        country: selectedCountry,
        price,
        userId: user.id,
        balance: balance
      });

      // Show immediate feedback
      success("Starting Rental", "Contacting DaisySMS API...", 2000);

      console.log("📡 Creating DaisySMS service instance...");
      const daisyService = await DaisySMSService.createWithStoredKey();
      console.log("✅ DaisySMS service created successfully");

      result = await daisyService.getNumber(
        selectedService.toString(),
        selectedCountry.toString(),
        price, // Use actual calculated price instead of hardcoded value
        user.id,
        {
          areas: areaCodes || undefined,
          carriers: carriers !== "Any Carrier" ? carriers : undefined,
          phone: phoneNumber || undefined,
          duration: !isShortTerm
            ? `${durationValue} ${durationUnit}`
            : undefined,
          renewable: renewable,
          autoRenew: autoRenew,
          serviceName: serviceInput || undefined, // Pass the exact service name from UI
        }
      );

      console.log("✅ DaisySMS rental result:", result);

      // Update progress
      success("API Success", "Number received from DaisySMS!", 2000);

      if (!result || !result.id || !result.number) {
        throw new Error("Invalid response from DaisySMS API - missing ID or number");
      }

      console.log("✅ Rental created successfully by DaisySMS service");
      
      // Another progress update
      success("Creating Record", "Saving rental to database...", 2000);

      // Immediately add rental to local state for instant UI feedback
      const newRental = {
        id: result.id,
        documentId: result.id,
        userId: user.id,
        number: result.number,
        service: serviceInput || getServiceName(selectedService), // Use serviceInput (the display name) first, fallback to lookup
        serviceCode: selectedService,
        country: getCountryName(selectedCountry),
        countryCode: selectedCountry,
        status: "waiting",
        userPrice: price,
        actualPrice: price,
        daisyPrice: result.daisyPrice || price,
        profit: Math.max(0, price - (result.daisyPrice || price)),
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
        lastChecked: new Date(),
        code: null,
        initialStatus: "waiting"
      };

      // Add to rentals immediately for instant UI update (check for duplicates)
      setRentals(prev => {
        // Check if rental already exists to prevent duplicates
        const exists = prev.some(r => r.id === newRental.id);
        if (exists) {
          console.log("🔄 Rental already exists in state, skipping duplicate:", newRental.id);
          return prev;
        }
        
        const updated = [newRental, ...prev];
        console.log("📋 Updated rentals array:", {
          totalCount: updated.length,
          newRentalId: newRental.id,
          firstFewIds: updated.slice(0, 3).map(r => r.id)
        });
        return updated;
      });
      
      // Ensure the new rental is visible by increasing display count if needed
      setDisplayCount(prev => {
        const newCount = Math.max(prev, Math.min(prev + 1, 10));
        console.log("📊 Updated display count:", { previous: prev, new: newCount });
        return newCount;
      });
      
      console.log("✅ Added rental to local state for immediate display");

      success("Number Rented!", `Number: ${result.number}`);

      // Set initial timer
      setInitialTimers((prev) => ({ ...prev, [result.id]: 418 }));

      await fetchBalance();
      
      setSelectedService("");
      setServiceInput("");
    } catch (rentError) {
      console.error("Error renting number:", rentError);
      
      // Show detailed error message
      let errorMessage = "Failed to rent number. Please try again.";
      let errorTitle = "Rental Failed";
      
      if (rentError instanceof Error) {
        errorMessage = rentError.message;
        
        // Provide more specific guidance based on error type
        if (errorMessage.includes("Insufficient balance")) {
          errorTitle = "Insufficient Balance";
          errorMessage += " Please add funds to your wallet and try again.";
        } else if (errorMessage.includes("permission-denied") || errorMessage.includes("unauthenticated")) {
          errorTitle = "Authentication Error";
          errorMessage = "Please log out and log back in, then try again.";
        } else if (errorMessage.includes("Failed to create rental record")) {
          errorTitle = "Database Error";
          errorMessage += " Your balance was not charged. Please try again or contact support.";
        }
      }
      
      error(errorTitle, errorMessage);
    } finally {
      setRenting(false);
    }
  };

  const getTimeRemainingSeconds = (rental: any): number => {
    if (rental.status !== "waiting") return 0;

    if (initialTimers[rental.id] !== undefined) {
      const elapsed = Math.floor(
        (currentTime - rental.createdAt.getTime()) / 1000
      );
      const remaining = Math.max(0, initialTimers[rental.id] - elapsed);
      return remaining;
    }

    if (rental.expiresAt) {
      const diff = rental.expiresAt.getTime() - currentTime;
      return Math.max(0, Math.floor(diff / 1000));
    }

    return 418;
  };

  const formatTimeRemaining = (seconds: number): string => {
    if (seconds <= 0) return "Expired";

    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`;
    } else {
      return `${remainingSeconds}s`;
    }
  };

  const handleCancelRental = async (rentalId: string) => {
    try {
      // Immediate UI feedback
      setRentals(prev => prev.map(rental => 
        rental.id === rentalId 
          ? { ...rental, status: 'cancelling' }
          : rental
      ));

      // Find the rental to get pricing info
      const rental = rentals.find(r => r.id === rentalId);
      if (!rental) {
        throw new Error('Rental not found');
      }

      const exactUserPrice = rental.userPrice || 0;
      
      if (exactUserPrice <= 0) {
        throw new Error('Invalid rental price for refund calculation');
      }

      console.log('Cancelling rental with exact refund amount:', {
        rentalId: rentalId,
        userPrice: rental.userPrice,
        actualPrice: rental.actualPrice,
        exactRefundAmount: exactUserPrice
      });

      const daisyService = await DaisySMSService.createWithStoredKey();
      await daisyService.cancelActivation(rentalId, user!.id);
      
      success('Rental Cancelled', 'Number cancelled and refunded');
     
      // Update UI immediately instead of reloading
      setRentals(prev => prev.map(rental => 
        rental.id === rentalId 
          ? { ...rental, status: 'cancelled', cancelledAt: new Date() }
          : rental
      ));
      
      // Reload data in background for consistency
      loadRentals();
    } catch (err) {
      console.error('Error cancelling rental:', err);
      // Revert UI state on error
      setRentals(prev => prev.map(rental => 
        rental.id === rentalId 
          ? { ...rental, status: 'waiting' }
          : rental
      ));
      error('Cancel Failed', 'Failed to cancel rental');
    }
  };

  const handleShowSMSText = (rental: any) => {
    setSmsTextData(rental);
    setShowSMSText(rental.id);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    success("Copied!", "Text copied to clipboard");
  };

  const calculateUserPrice = (daisyPrice: number) => {
    return Math.round(daisyPrice * (1 + markupPercentage / 100) * 100) / 100;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return (
          <span className="px-3 py-1 bg-green-500 text-white text-xs font-medium rounded-full">
            Success
          </span>
        );
      case "waiting":
        return (
          <span className="px-3 py-1 bg-yellow-500 text-white text-xs font-medium rounded-full">
            Waiting
          </span>
        );
      case "cancelled":
        return (
          <span className="px-3 py-1 bg-red-500 text-white text-xs font-medium rounded-full">
            Cancelled
          </span>
        );
      case "cancelling":
        return (
          <span className="px-3 py-1 bg-orange-500 text-white text-xs font-medium rounded-full">
            Cancelling...
          </span>
        );
      default:
        return (
          <span className="px-3 py-1 bg-gray-500 text-white text-xs font-medium rounded-full">
            Unknown
          </span>
        );
    }
  };

  const getRentalDuration = (rental: any): string => {
    if (!rental.createdAt) return "N/A";

    const now = new Date();
    const created =
      rental.createdAt instanceof Date
        ? rental.createdAt
        : new Date(rental.createdAt);
    const diffMs = now.getTime() - created.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));

    if (diffMins < 60) {
      return `${diffMins}m`;
    } else {
      const hours = Math.floor(diffMins / 60);
      const mins = diffMins % 60;
      return `${hours}h ${mins}m`;
    }
  };

  const { price, available } = getServicePrice();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader size="lg" text="Loading numbers..." showText={true} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Desktop Layout */}
      <div className="hidden lg:block">
        <div className="max-w-7xl mx-auto p-6">
          <div className="grid grid-cols-2 gap-8">
            {/* Left Column - SMS Verifications */}
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">
                  SMS Verifications
                </h1>
                <p className="text-gray-600 mb-1">Rent a phone number</p>
                <p className="text-gray-600 text-sm">
                  Credits are only used if you receive the SMS code.
                </p>
              </div>

              {/* Service Selection */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Service
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={serviceInput}
                      onChange={(e) => setServiceInput(e.target.value)}
                      onFocus={() => setShowServiceDropdown(true)}
                      placeholder="Select a service..."
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                    />

                    {/* Service Dropdown */}
                    {showServiceDropdown && (
                      <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg z-10 mt-1 max-h-64 overflow-y-auto">
                        {!pricingLoaded ? (
                          <div className="p-4 text-center">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
                            <p className="text-sm text-gray-600">
                              Loading pricing...
                            </p>
                          </div>
                        ) : (
                          (serviceInput
                            ? allServices.filter(
                                (service) =>
                                  service.name
                                    .toLowerCase()
                                    .includes(serviceInput.toLowerCase()) ||
                                  service.code
                                    .toLowerCase()
                                    .includes(serviceInput.toLowerCase())
                              )
                            : allServices
                          ).map((service) => {
                            const cost = getServicePriceForDropdown(
                              service.code
                            );
                            const costNGN = cost * exchangeRate;
                            return (
                              <div
                                key={service.code}
                                onClick={() => handleServiceSelect(service)}
                                className="flex items-center justify-between p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                              >
                                <div>
                                  <span className="font-medium text-gray-900">
                                    {service.name}
                                  </span>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <div className="text-right">
                                    <div className="font-semibold text-gray-900">
                                      ${cost.toFixed(2)}
                                    </div>
                                    <div className="text-xs text-gray-500">
                                      ₦
                                      {costNGN.toLocaleString("en-NG", {
                                        maximumFractionDigits: 0,
                                      })}
                                    </div>
                                  </div>
                                  <Heart className="w-4 h-4 text-gray-400" />
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
                    className="mt-2 text-sm text-blue-600 hover:text-blue-800 flex items-center space-x-1"
                  >
                    <span>
                      {showAdvancedOptions
                        ? "Hide more options"
                        : "Show more options"}
                    </span>
                    <ChevronDown
                      className={`w-4 h-4 transition-transform ${
                        showAdvancedOptions ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                </div>

                {/* Advanced Options - Exactly like DaisySMS */}
                {showAdvancedOptions && (
                  <div className="space-y-4 p-4 bg-gray-50 rounded-lg border">
                    <div>
                      <div className="flex items-center space-x-2 mb-2">
                        <label className="block text-sm font-medium text-gray-700">
                          Area codes
                        </label>
                        <Info className="w-4 h-4 text-blue-500" />
                      </div>
                      <input
                        type="text"
                        value={areaCodes}
                        onChange={(e) => setAreaCodes(e.target.value)}
                        placeholder="503, 202, 404"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                      />
                    </div>

                    <div>
                      <div className="flex items-center space-x-2 mb-2">
                        <label className="block text-sm font-medium text-gray-700">
                          Carriers
                        </label>
                        <Info className="w-4 h-4 text-blue-500" />
                      </div>
                      <input
                        type="text"
                        value={carriers}
                        onChange={(e) => setCarriers(e.target.value)}
                        placeholder="Any Carrier"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                      />
                    </div>

                    <div>
                      <div className="flex items-center space-x-2 mb-2">
                        <label className="block text-sm font-medium text-gray-700">
                          Phone
                        </label>
                        <Info className="w-4 h-4 text-blue-500" />
                      </div>
                      <input
                        type="text"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        placeholder="1112223333"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                      />
                    </div>

                    <div>
                      <div className="flex items-center space-x-2 mb-2">
                        <label className="block text-sm font-medium text-gray-700">
                          Duration
                        </label>
                        <Info className="w-4 h-4 text-blue-500" />
                      </div>
                      <div className="space-y-3">
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={isShortTerm}
                            onChange={(e) => setIsShortTerm(e.target.checked)}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                          <span className="text-sm text-gray-700">
                            Short-term rental
                          </span>
                        </div>

                        {!isShortTerm && (
                          <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-2">
                              <input
                                type="number"
                                value={durationValue}
                                onChange={(e) =>
                                  setDurationValue(e.target.value)
                                }
                                min="1"
                                max="365"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                                placeholder="1"
                              />
                              <select
                                value={durationUnit}
                                onChange={(e) =>
                                  setDurationUnit(e.target.value)
                                }
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                              >
                                <option value="Days">Days</option>
                                <option value="Months">Months</option>
                              </select>
                            </div>

                            <div className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                checked={renewable}
                                onChange={(e) => setRenewable(e.target.checked)}
                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                              />
                              <span className="text-sm text-gray-700">
                                Renewable
                              </span>
                            </div>

                            <div className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                checked={autoRenew}
                                onChange={(e) => setAutoRenew(e.target.checked)}
                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                              />
                              <span className="text-sm text-gray-700">
                                Auto-renew
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Renting Cost */}
                <div className="space-y-2">
                  <p className="text-gray-700 font-medium">Renting cost:</p>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-gray-900">
                      ${price.toFixed(2)}
                    </div>
                    <div className="text-sm text-gray-600">
                      ₦
                      {(price * exchangeRate).toLocaleString("en-NG", {
                        maximumFractionDigits: 0,
                      })}
                    </div>
                    <div className="text-sm text-gray-600">
                      {available} available
                    </div>
                  </div>
                </div>

                {/* Rent Button */}
                <Button
                  onClick={handleRentNumber}
                  disabled={
                    renting ||
                    !selectedService ||
                    available === 0 ||
                    balance < price
                  }
                  className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-4 text-lg rounded-lg"
                  size="lg"
                >
                  {renting
                    ? "RENTING..."
                    : !selectedService
                    ? "SELECT A SERVICE"
                    : available === 0
                    ? "OUT OF STOCK"
                    : "RENT NUMBER"}
                </Button>

                {balance < price && available > 0 && (
                  <p className="text-red-600 text-sm text-center">
                    Insufficient balance. Need ${(price - balance).toFixed(2)}{" "}
                    more.
                  </p>
                )}
              </div>
            </div>

            {/* Right Column - Rented Numbers Table */}
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">
                  Rented numbers
                </h2>
                <div className="text-sm text-gray-600">
                  {rentals.length} / 10
                </div>
              </div>

              {/* Table */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                          ID
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                          SERVICE
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                          PHONE
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                          CODE
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                          COST
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                          STATUS
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                          <Zap className="w-4 h-4 text-yellow-500" />
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                          ACTIONS
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                    {rentals.length === 0 ? (
                    <tr>
                    <td
                    colSpan={8}
                    className="px-4 py-8 text-center text-gray-500"
                    >
                    No rented numbers yet
                    </td>
                    </tr>
                    ) : (
                    (() => {
                          const visibleRentals = rentals.slice(0, displayCount);
                          console.log("🎯 Rendering table rows:", {
                            totalRentals: rentals.length,
                            displayCount,
                            visibleCount: visibleRentals.length,
                            visibleRentalIds: visibleRentals.map(r => r.id)
                          });
                          return visibleRentals.map((rental, index) => {
                          const timeRemaining = getTimeRemainingSeconds(rental);
                          return (
                            <tr
                              key={`desktop-rental-${rental.id}-${index}`}
                              className="hover:bg-gray-50"
                            >
                              <td className="px-4 py-3 text-sm text-blue-600 font-mono">
                                {rental.id.substring(0, 8)}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-900 font-medium">
                                {rental.service}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-900 font-mono">
                                {rental.number}
                              </td>
                              <td className="px-4 py-3 text-sm">
                                {rental.code ? (
                                  <span className="font-mono font-bold text-green-600">
                                    {rental.code}
                                  </span>
                                ) : (
                                  <div className="flex items-center space-x-1">
                                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600"></div>
                                    <span className="text-xs text-gray-500">
                                      Waiting...
                                    </span>
                                  </div>
                                )}
                              </td>
                              <td className="px-4 py-3">
                                {!pricingLoaded ? (
                                  <div className="animate-pulse">
                                    <div className="h-4 bg-gray-200 rounded w-16 mb-1"></div>
                                    <div className="h-3 bg-gray-200 rounded w-12"></div>
                                  </div>
                                ) : (
                                  <div>
                                    <div className="font-semibold text-gray-900">
                                      {formatCurrency(getCurrentPrice(rental))}
                                    </div>
                                    <div className="text-xs text-gray-500">
                                      ≈ ₦
                                      {(
                                        getCurrentPrice(rental) * exchangeRate
                                      ).toLocaleString("en-NG", {
                                        maximumFractionDigits: 0,
                                      })}
                                    </div>
                                  </div>
                                )}
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex items-center space-x-2">
                                  {getStatusBadge(rental.status)}
                                </div>
                              </td>
                              <td className="px-4 py-3 text-center">
                                {rental.status === "waiting" ? (
                                  <span
                                    className={`text-sm font-bold ${
                                      timeRemaining > 300
                                        ? "text-blue-600"
                                        : timeRemaining > 100
                                        ? "text-orange-600"
                                        : "text-red-600"
                                    }`}
                                  >
                                    {timeRemaining}s
                                  </span>
                                ) : null}
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex items-center space-x-2">
                                  {rental.status === 'waiting' && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleCancelRental(rental.id)}
                                      className="text-red-600 hover:text-red-800 hover:border-red-300"
                                    >
                                      Cancel
                                    </Button>
                                  )}
                                  <button
                                    onClick={() => handleShowSMSText(rental)}
                                    className="p-1 hover:bg-gray-100 rounded"
                                  >
                                    <MoreVertical className="w-4 h-4 text-gray-600" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        });
                      })()
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Load More Button */}
                {displayCount < rentals.length && (
                  <div className="text-center pt-4 border-t border-gray-200">
                    <div className="text-sm text-gray-600 mb-3">
                      Showing {displayCount} of {rentals.length} numbers
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => setDisplayCount((prev) => prev + 6)}
                      className="w-full sm:w-auto"
                    >
                      Load More ({rentals.length - displayCount} remaining)
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Layout */}
      <div className="lg:hidden min-h-screen bg-gray-50 pb-20">
        <div className="p-4 space-y-6">
          {/* Header */}
          <div className="text-center">
            <h1 className="text-xl font-bold text-gray-900 mb-1">
              SMS Verifications
            </h1>
            <p className="text-sm text-gray-600 mb-1">
              Rent a phone number for 7min
            </p>
            <p className="text-xs text-gray-500">
              Credits are only used if you receive the SMS code.
            </p>
          </div>

          {/* Service Selection Card */}
          <Card>
            <CardContent className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Service
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={serviceInput}
                    onChange={(e) => setServiceInput(e.target.value)}
                    onFocus={() => setShowServiceDropdown(true)}
                    placeholder="Type here"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  />

                  {showServiceDropdown && (
                    <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg z-10 mt-1 max-h-64 overflow-y-auto">
                      {servicesLoading && allServices.length === 0 && (
                        <div className="p-4 text-center">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
                          <div className="text-sm text-gray-600">
                            Loading services...
                          </div>
                        </div>
                      )}
                      {allServices
                        .filter(
                          (service) =>
                            service.name
                              .toLowerCase()
                              .includes(serviceInput.toLowerCase()) ||
                            service.code
                              .toLowerCase()
                              .includes(serviceInput.toLowerCase())
                        )
                        .map((service) => {
                          return (
                            <div
                              key={`mobile-service-${service.code}-${service.name}`}
                              onClick={() => handleServiceSelect(service)}
                              className="flex items-center justify-between p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                            >
                              <div>
                                <span className="font-medium text-gray-900">
                                  {service.name}
                                </span>
                              </div>
                              {!pricingLoaded ? (
                                <div className="flex items-center space-x-2">
                                  <div className="text-right">
                                    <div className="animate-pulse bg-gray-200 rounded h-4 w-12"></div>
                                    <div className="animate-pulse bg-gray-200 rounded h-3 w-16 mt-1"></div>
                                  </div>
                                  <Heart className="w-4 h-4 text-gray-400" />
                                </div>
                              ) : (
                                <div className="flex items-center space-x-2">
                                  <div className="text-right">
                                    {(() => {
                                      const cost = getServicePriceForDropdown(
                                        service.code
                                      );
                                      const costNGN = cost * exchangeRate;
                                      return (
                                        <>
                                          <div className="font-semibold text-gray-900">
                                            ${cost.toFixed(2)}
                                          </div>
                                          <div className="text-xs text-gray-500">
                                            ₦
                                            {costNGN.toLocaleString("en-NG", {
                                              maximumFractionDigits: 0,
                                            })}
                                          </div>
                                        </>
                                      );
                                    })()}
                                  </div>
                                  <Heart className="w-4 h-4 text-gray-400" />
                                </div>
                              )}
                            </div>
                          );
                        })}
                    </div>
                  )}
                </div>

                <button
                  onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
                  className="mt-2 text-sm text-blue-600 hover:text-blue-800 flex items-center space-x-1"
                >
                  <span>
                    {showAdvancedOptions
                      ? "Hide more options"
                      : "Show more options"}
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 transition-transform ${
                      showAdvancedOptions ? "rotate-180" : ""
                    }`}
                  />
                </button>
              </div>

              {/* Advanced Options for Mobile */}
              {showAdvancedOptions && (
                <div className="space-y-4 p-4 bg-gray-50 rounded-lg border">
                  <div>
                    <div className="flex items-center space-x-2 mb-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Area codes
                      </label>
                      <Info className="w-4 h-4 text-blue-500" />
                    </div>
                    <input
                      type="text"
                      value={areaCodes}
                      onChange={(e) => setAreaCodes(e.target.value)}
                      placeholder="503, 202, 404"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                    />
                  </div>

                  <div>
                    <div className="flex items-center space-x-2 mb-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Carriers
                      </label>
                      <Info className="w-4 h-4 text-blue-500" />
                    </div>
                    <input
                      type="text"
                      value={carriers}
                      onChange={(e) => setCarriers(e.target.value)}
                      placeholder="Any Carrier"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                    />
                  </div>

                  <div>
                    <div className="flex items-center space-x-2 mb-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Phone
                      </label>
                      <Info className="w-4 h-4 text-blue-500" />
                    </div>
                    <input
                      type="text"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="1112223333"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                    />
                  </div>

                  <div>
                    <div className="flex items-center space-x-2 mb-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Duration
                      </label>
                      <Info className="w-4 h-4 text-blue-500" />
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={isShortTerm}
                          onChange={(e) => setIsShortTerm(e.target.checked)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <span className="text-sm text-gray-700">
                          Short-term rental
                        </span>
                      </div>

                      {!isShortTerm && (
                        <div className="space-y-3">
                          <div className="grid grid-cols-2 gap-2">
                            <input
                              type="number"
                              value={durationValue}
                              onChange={(e) => setDurationValue(e.target.value)}
                              min="1"
                              max="365"
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                              placeholder="1"
                            />
                            <select
                              value={durationUnit}
                              onChange={(e) => setDurationUnit(e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                            >
                              <option value="Days">Days</option>
                              <option value="Months">Months</option>
                            </select>
                          </div>

                          <div className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              checked={renewable}
                              onChange={(e) => setRenewable(e.target.checked)}
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            <span className="text-sm text-gray-700">
                              Renewable
                            </span>
                          </div>

                          <div className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              checked={autoRenew}
                              onChange={(e) => setAutoRenew(e.target.checked)}
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            <span className="text-sm text-gray-700">
                              Auto-renew
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Renting Cost */}
              <div className="text-center space-y-2">
                <p className="text-gray-700 font-medium">Renting cost:</p>
                <div className="text-3xl font-bold text-gray-900">
                  ${price.toFixed(2)}
                </div>
                <div className="text-sm text-gray-600">
                  ₦
                  {(price * exchangeRate).toLocaleString("en-NG", {
                    maximumFractionDigits: 0,
                  })}
                </div>
                <div className="text-sm text-gray-600">
                  {available} available
                </div>
              </div>

              {/* Rent Button */}
              <Button
                onClick={handleRentNumber}
                disabled={renting || !selectedService || available === 0}
                className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-4 text-lg rounded-lg"
                size="lg"
              >
                {renting
                  ? "RENTING..."
                  : !selectedService
                  ? "SELECT A SERVICE"
                  : available === 0
                  ? "OUT OF STOCK"
                  : "RENT NUMBER"}
              </Button>

              {balance < price && available > 0 && (
                <p className="text-red-600 text-sm text-center">
                  Insufficient balance. Need ${(price - balance).toFixed(2)}{" "}
                  more.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Rented Numbers */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">
                Rented numbers
              </h2>
              <div className="text-sm text-gray-600">{rentals.length} / 10</div>
            </div>

            {rentals.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <Smartphone className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    No Numbers Rented
                  </h3>
                  <p className="text-gray-600 mb-4">
                    Rent your first virtual number to get started
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {rentals.slice(0, displayCount).map((rental, index) => {
                  const timeRemaining = getTimeRemainingSeconds(rental);
                  return (
                    <Card key={`mobile-rental-${rental.id}-${index}`}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="text-sm text-gray-500">
                            #{rental.id.substring(0, 10)}
                          </div>
                          <div className="text-sm font-semibold text-gray-900">
                            {rental.service}
                          </div>
                        </div>

                        <div className="flex items-center justify-between mb-3">
                          <div className="text-sm text-gray-600">
                            {rental.number}
                          </div>
                          <div className="text-right">
                            {!pricingLoaded ? (
                              <div className="animate-pulse">
                                <div className="h-4 bg-gray-200 rounded w-16 mb-1"></div>
                                <div className="h-3 bg-gray-200 rounded w-12"></div>
                              </div>
                            ) : (
                              <div>
                                <div className="text-sm text-gray-900 font-semibold">
                                  {formatCurrency(getCurrentPrice(rental))}
                                </div>
                                <div className="text-xs text-gray-500">
                                  ≈ ₦
                                  {(
                                    getCurrentPrice(rental) * exchangeRate
                                  ).toLocaleString("en-NG", {
                                    maximumFractionDigits: 0,
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center justify-between mt-3">
                          <div className="flex items-center space-x-2">
                            <span className="text-sm text-gray-600 font-medium">
                              Code:
                            </span>
                            {rental.status === "waiting" ? (
                              <div className="flex items-center space-x-2">
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  width="16"
                                  height="16"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  className="text-gray-400"
                                >
                                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
                                </svg>
                                <span
                                  className={`text-sm font-bold ${
                                    timeRemaining > 300
                                      ? "text-blue-600"
                                      : timeRemaining > 100
                                      ? "text-orange-600"
                                      : "text-red-600"
                                  }`}
                                >
                                  {timeRemaining}
                                </span>
                              </div>
                            ) : (
                              <span className="text-sm font-bold text-gray-900">
                                {rental.code || "-"}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center space-x-1">
                            {getStatusBadge(rental.status)}

                            {rental.status === 'waiting' && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleCancelRental(rental.id)}
                                className="text-red-600 hover:text-red-800 hover:border-red-300"
                              >
                                Cancel
                              </Button>
                            )}

                            <button
                              onClick={() => handleShowSMSText(rental)}
                              className="p-1 hover:bg-gray-100 rounded"
                            >
                              <MoreVertical className="w-4 h-4 text-gray-600" />
                            </button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}

                {/* Load More Button */}
                {rentals.length > displayCount && (
                  <div className="text-center mt-4 pt-4 border-t border-gray-200">
                    <Button
                      variant="outline"
                      onClick={() => setDisplayCount((prev) => prev + 6)}
                      className="w-full sm:w-auto px-6 py-2"
                    >
                      Load More ({rentals.length - displayCount} remaining)
                    </Button>
                    <p className="text-xs text-gray-500 mt-2">
                      Showing {displayCount} of {rentals.length} numbers
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* SMS Text Popup */}
      {showSMSText && smsTextData && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                SMS Details
              </h3>
              <button
                onClick={() => setShowSMSText(null)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-900">
                  {smsTextData.service} code:{" "}
                  <span className="font-bold">
                    {smsTextData.code || "Waiting..."}
                  </span>
                </p>
                {smsTextData.code && (
                  <button
                    onClick={() => copyToClipboard(smsTextData.code)}
                    className="mt-2 text-blue-600 hover:text-blue-800 text-sm"
                  >
                    Copy Code
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-600">Phone</p>
                  <p className="font-mono">{smsTextData.number}</p>
                </div>
                <div>
                  <p className="text-gray-600">Service</p>
                  <p>{smsTextData.service}</p>
                </div>
                <div>
                  <p className="text-gray-600">Status</p>
                  <p className="capitalize">{smsTextData.status}</p>
                </div>
                <div>
                  <p className="text-gray-600">Cost</p>
                  <p>{formatCurrency(smsTextData.userPrice || 0)}</p>
                </div>
                <div>
                  <p className="text-gray-600">Duration</p>
                  <p>{getRentalDuration(smsTextData)}</p>
                </div>
                <div>
                  <p className="text-gray-600">Expires</p>
                  <p className="text-xs">
                    {smsTextData.expiresAt
                      ? formatDate(smsTextData.expiresAt)
                      : "N/A"}
                  </p>
                </div>
              </div>

              {smsTextData.renewable && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <div className="flex items-center space-x-2 text-blue-800 text-sm">
                    <RefreshCw className="w-4 h-4" />
                    <span>This number can be renewed for extended use</span>
                  </div>
                </div>
              )}

              {smsTextData.autoRenew && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <div className="flex items-center space-x-2 text-green-800 text-sm">
                    <RefreshCw className="w-4 h-4" />
                    <span>Auto-renewal is enabled for this number</span>
                  </div>
                </div>
              )}

              <div className="flex space-x-2">
                {smsTextData.code && (
                  <Button
                    onClick={() => copyToClipboard(smsTextData.code)}
                    variant="outline"
                    className="flex-1"
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    Copy Code
                  </Button>
                )}
                {smsTextData.status === 'waiting' && (
                  <Button
                    onClick={() => {
                      handleCancelRental(smsTextData.id);
                      setShowSMSText(null);
                    }}
                    variant="outline"
                    className="flex-1 text-red-600 hover:text-red-800 hover:border-red-300"
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Cancel
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default NumbersPage;
