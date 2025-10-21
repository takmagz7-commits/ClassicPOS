"use client";

import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/components/auth/AuthContext";
import { SaleProvider } from "@/context/SaleContext";
import { ProductProvider } from "@/context/ProductContext";
import { CustomerProvider } from "@/context/CustomerContext";
import { CurrencyProvider } from "@/context/CurrencyContext";
import { ReceiptSettingsProvider } from "@/context/ReceiptSettingsContext";
import { PrinterSettingsProvider } from "@/context/PrinterSettingsContext";
import { TaxProvider } from "@/context/TaxContext";
import { CategoryProvider } from "@/context/CategoryContext";
import { LoadingProvider } from "@/context/LoadingContext";
import { PaymentMethodProvider } from "@/context/PaymentMethodContext";
import { StoreProvider } from "@/context/StoreContext";
import { SupplierProvider } from "@/context/SupplierContext";
import { InventoryHistoryProvider } from "@/context/InventoryHistoryContext";
import { PurchaseOrderProvider } from "@/context/PurchaseOrderContext";
import { GRNProvider } from "@/context/GRNContext";
import { StockAdjustmentProvider } from "@/context/StockAdjustmentContext";
import { TransferOfGoodsProvider } from "@/context/TransferOfGoodsContext";
import { LoyaltySettingsProvider } from "@/context/LoyaltySettingsContext";
import { ReportProvider } from "@/context/ReportContext";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { routesConfig } from "@/config/routesConfig";
import NotFound from "@/pages/NotFound";
import { Toaster } from "@/components/ui/sonner";
import GlobalLoader from "@/components/common/GlobalLoader";
import { ThemeProvider } from "@/components/layout/ThemeProvider";
import ErrorBoundary from "@/components/common/ErrorBoundary";

function App() {
  const LoginRoute = routesConfig.find(r => r.path === "/login");
  const LoginComponent = LoginRoute?.component;

  const SignupRoute = routesConfig.find(r => r.path === "/signup");
  const SignupComponent = SignupRoute?.component;

  const PinSetupRoute = routesConfig.find(r => r.path === "/setup-pin");
  const PinSetupComponent = PinSetupRoute?.component;

  return (
    <ErrorBoundary>
      <BrowserRouter>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <LoadingProvider>
          <AuthProvider>
            <StoreProvider>
              <SupplierProvider>
                <CategoryProvider>
                  <CustomerProvider>
                    <CurrencyProvider>
                      <ReceiptSettingsProvider>
                        <PrinterSettingsProvider>
                          <TaxProvider>
                            <PaymentMethodProvider>
                              <LoyaltySettingsProvider>
                                <InventoryHistoryProvider>
                                  <ProductProvider>
                                    <PurchaseOrderProvider>
                                      <GRNProvider>
                                        <StockAdjustmentProvider>
                                          <TransferOfGoodsProvider>
                                            <SaleProvider>
                                              <ReportProvider>
                                                <>
                                                  <Toaster richColors position="top-right" />
                                                  <GlobalLoader />
                                                  <Routes>
                                                <Route path="/login" element={LoginComponent && <LoginComponent />} />
                                                <Route path="/signup" element={SignupComponent && <SignupComponent />} />
                                                <Route path="/setup-pin" element={PinSetupComponent && <PinSetupComponent />} />

                                                <Route path="/" element={<ProtectedRoute />}>
                                                  {routesConfig.map((route) => {
                                                    if (route.path === "/login" || route.path === "/signup" || route.path === "/setup-pin") {
                                                      return null;
                                                    }
                                                    const Component = route.component;
                                                    // Adjust path for parameterized routes
                                                    const path = route.path.startsWith("/") ? route.path.substring(1) : route.path;
                                                    return (
                                                      <Route
                                                        key={route.path}
                                                        path={path}
                                                        index={route.path === "/"}
                                                        element={<Component />}
                                                      />
                                                    );
                                                  })}
                                                </Route>
                                                <Route path="*" element={<NotFound />} />
                                                  </Routes>
                                                </>
                                              </ReportProvider>
                                            </SaleProvider>
                                          </TransferOfGoodsProvider>
                                        </StockAdjustmentProvider>
                                      </GRNProvider>
                                    </PurchaseOrderProvider>
                                  </ProductProvider>
                                </InventoryHistoryProvider>
                              </LoyaltySettingsProvider>
                            </PaymentMethodProvider>
                          </TaxProvider>
                        </PrinterSettingsProvider>
                      </ReceiptSettingsProvider>
                    </CurrencyProvider>
                  </CustomerProvider>
                </CategoryProvider>
              </SupplierProvider>
            </StoreProvider>
          </AuthProvider>
          </LoadingProvider>
        </ThemeProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;