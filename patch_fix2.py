with open("src/components/features/EstoqueManager.tsx", "r", encoding="utf-8") as f:
    c = f.read()

# Fix proxy URL
c = c.replace("proxy-image • url=", "proxy-image?url=")

# Fix optionals chaining
c = c.replace("v.km • .toLocaleString", "v.km?.toLocaleString")
c = c.replace("selectedVehicle.km • .toLocaleString", "selectedVehicle.km?.toLocaleString")

# Fix ternaries
c = c.replace("{bndvClients.length === 0 • (", "{bndvClients.length === 0 ? (")
c = c.replace("{isLoading • <Loader2", "{isLoading ? <Loader2")
c = c.replace("{principalPic • (", "{principalPic ? (")
c = c.replace("{v.saleValue • new Intl", "{v.saleValue ? new Intl")
c = c.replace("{selectedVehicle.saleValue • new Intl", "{selectedVehicle.saleValue ? new Intl")
c = c.replace("{isDownloading • (", "{isDownloading ? (")

with open("src/components/features/EstoqueManager.tsx", "w", encoding="utf-8") as f:
    f.write(c)
print("Restored broken replacements")
