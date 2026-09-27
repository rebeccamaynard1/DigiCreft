import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import Layout from "@/components/layout/Layout";
import { Download, FileText, Plus, LogOut, Loader2, AlertCircle, RefreshCw, Archive } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PRODUCTS } from "@/config/products";
import { toast } from "sonner";
import Seo from "@/components/Seo";

interface Order {
  id: string;
  product_id: string;
  status: string;
  generated_file_url: string | null;
  created_at: string;
  error_message: string | null;
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);
  const [zipping, setZipping] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }
      fetchOrders();
    };
    checkAuth();
  }, [navigate]);

  const fetchOrders = async () => {
    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching orders:", error);
      toast.error("Failed to load orders");
    } else {
      setOrders(data || []);
    }
    setLoading(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const handleRegenerate = async (orderId: string) => {
    setRegeneratingId(orderId);
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status: "generating", error_message: null } : o)),
    );
    try {
      const { data, error } = await supabase.functions.invoke("regenerate-product", {
        body: { orderId },
      });
      if (error || data?.error) throw new Error(error?.message || data?.error || "Regeneration failed");
      toast.success("PDF regenerated");
      await fetchOrders();
    } catch (err) {
      toast.error((err as Error)?.message || "Could not regenerate PDF");
      await fetchOrders();
    } finally {
      setRegeneratingId(null);
    }
  };

  const handleDownloadAll = async () => {
    setZipping(true);
    try {
      const { data, error } = await supabase.functions.invoke("download-all");
      if (error || !data?.fileUrl) {
        throw new Error(error?.message || data?.error || "Could not build ZIP");
      }
      window.open(data.fileUrl, "_blank", "noopener,noreferrer");
      toast.success(`Downloading ${data.count} file${data.count === 1 ? "" : "s"}`);
    } catch (err) {
      toast.error((err as Error)?.message || "Could not prepare download");
    } finally {
      setZipping(false);
    }
  };

  const getProductInfo = (productId: string) => {
    return PRODUCTS[productId] || { name: productId, icon: "📄" };
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: "bg-yellow-100 text-yellow-800",
      paid: "bg-blue-100 text-blue-800",
      generating: "bg-purple-100 text-purple-800",
      completed: "bg-green-100 text-green-800",
      failed: "bg-red-100 text-red-800",
      expired: "bg-muted text-muted-foreground",
    };
    return (
      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[status] || "bg-gray-100 text-gray-800"}`}>
        {status === "generating" && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  return (
    <Layout>
      <Seo
        title="My Dashboard | DigiCraft"
        description="View your DigiCraft orders and download your generated digital products."
        path="/dashboard"
        noindex
      />
      <section className="py-12">
        <div className="container">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-display text-3xl font-bold">My Dashboard</h1>
              <p className="mt-1 text-muted-foreground">Your digital products and downloads</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                onClick={handleDownloadAll}
                disabled={zipping || !orders.some((o) => o.status === "completed" && o.generated_file_url)}
              >
                {zipping ? (
                  <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                ) : (
                  <Archive className="mr-1 h-4 w-4" />
                )}
                Download All
              </Button>
              <Button variant="hero" asChild>
                <Link to="/products"><Plus className="mr-1 h-4 w-4" /> New Product</Link>
              </Button>
              <Button variant="outline" onClick={handleLogout}>
                <LogOut className="mr-1 h-4 w-4" /> Sign Out
              </Button>
            </div>
          </div>

          <div className="mt-8 grid gap-4">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : orders.length > 0 ? (
              orders.map((order) => {
                const product = getProductInfo(order.product_id);
                return (
                  <div key={order.id} className="rounded-2xl border border-border bg-card p-5 shadow-card">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-xl">
                          {product.icon}
                        </div>
                        <div>
                          <h3 className="font-display font-bold">{product.name}</h3>
                          <div className="mt-1 flex items-center gap-2">
                            <p className="text-sm text-muted-foreground">
                              {new Date(order.created_at).toLocaleDateString()}
                            </p>
                            {getStatusBadge(order.status)}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {order.status === "completed" && order.generated_file_url && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={async () => {
                                const { data, error } = await supabase.functions.invoke(
                                  "get-download-url",
                                  { body: { orderId: order.id } },
                                );
                                if (error || !data?.fileUrl) {
                                  toast.error("Could not prepare your download");
                                  return;
                                }
                                window.open(data.fileUrl, "_blank", "noopener,noreferrer");
                              }}
                            >
                              <Download className="mr-1 h-4 w-4" /> Download
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRegenerate(order.id)}
                              disabled={regeneratingId === order.id}
                              title="Re-run generation and overwrite the PDF"
                            >
                              {regeneratingId === order.id ? (
                                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                              ) : (
                                <RefreshCw className="mr-1 h-4 w-4" />
                              )}
                              Regenerate
                            </Button>
                          </>
                        )}
                        {order.status === "failed" && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRegenerate(order.id)}
                            disabled={regeneratingId === order.id}
                          >
                            {regeneratingId === order.id ? (
                              <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                            ) : (
                              <RefreshCw className="mr-1 h-4 w-4" />
                            )}
                            Retry
                          </Button>
                        )}
                        {order.status === "generating" && (
                          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                        )}
                      </div>
                    </div>
                    {order.status === "failed" && (
                      <div className="mt-4 flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/5 p-3">
                        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                        <div className="text-sm">
                          <p className="font-semibold text-destructive">Generation failed</p>
                          <p className="mt-0.5 break-words text-muted-foreground">
                            {order.error_message || "No error details were recorded. Please contact support."}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="rounded-2xl border border-dashed border-border p-12 text-center">
                <FileText className="mx-auto h-10 w-10 text-muted-foreground" />
                <h3 className="mt-4 font-display font-bold">No products yet</h3>
                <p className="mt-1 text-sm text-muted-foreground">Create your first custom digital product!</p>
                <Button variant="hero" className="mt-4" asChild>
                  <Link to="/products">Browse Products</Link>
                </Button>
              </div>
            )}
          </div>
        </div>
      </section>
    </Layout>
  );
}
