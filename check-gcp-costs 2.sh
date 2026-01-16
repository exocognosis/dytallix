#!/bin/bash

# Dytallix GCP Cost Analysis Script
# This script checks current GCP resource usage and costs

set -euo pipefail

# Configuration
PROJECT_ID="${1:-dytallix}"
REGION="${2:-us-central1}"
ZONE="${3:-us-central1-a}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_header() {
    echo -e "${BLUE}============================================${NC}"
    echo -e "${BLUE}    Dytallix GCP Cost Analysis Report${NC}"
    echo -e "${BLUE}============================================${NC}"
    echo "Project: $PROJECT_ID"
    echo "Region: $REGION"
    echo "Zone: $ZONE"
    echo "Analysis Date: $(date)"
    echo ""
}

print_section() {
    echo -e "${YELLOW}📊 $1${NC}"
    echo "----------------------------------------"
}

check_authentication() {
    print_section "Authentication Check"
    
    if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | head -n 1 > /dev/null; then
        echo -e "${RED}❌ Not authenticated with Google Cloud${NC}"
        echo "Please run: gcloud auth login"
        exit 1
    fi
    
    local account=$(gcloud auth list --filter=status:ACTIVE --format="value(account)" | head -n 1)
    echo -e "${GREEN}✅ Authenticated as: $account${NC}"
    echo ""
}

check_billing() {
    print_section "Billing Information"
    
    # Check if billing is enabled
    local billing_enabled=$(gcloud alpha billing projects describe $PROJECT_ID --format="value(billingEnabled)" 2>/dev/null || echo "unknown")
    
    if [[ "$billing_enabled" == "True" ]]; then
        echo -e "${GREEN}✅ Billing is enabled${NC}"
        
        # Get billing account
        local billing_account=$(gcloud alpha billing projects describe $PROJECT_ID --format="value(billingAccountName)" 2>/dev/null || echo "N/A")
        echo "Billing Account: $billing_account"
        
        # Try to get current month costs (requires billing export)
        echo ""
        echo "💰 Current Month Estimated Costs:"
        echo "   (Note: Real-time costs require BigQuery billing export setup)"
        echo "   Use Cloud Console → Billing → Reports for detailed cost analysis"
        
    else
        echo -e "${RED}❌ Billing is not enabled or cannot be accessed${NC}"
    fi
    echo ""
}

check_gke_resources() {
    print_section "GKE Cluster Analysis"
    
    # List GKE clusters
    local clusters=$(gcloud container clusters list --project=$PROJECT_ID --format="table(name,location,status,currentMasterVersion,currentNodeVersion,numNodes)" 2>/dev/null || echo "")
    
    if [[ -n "$clusters" ]]; then
        echo "Active GKE Clusters:"
        echo "$clusters"
        echo ""
        
        # Get detailed node information
        local cluster_names=$(gcloud container clusters list --project=$PROJECT_ID --format="value(name)" 2>/dev/null || echo "")
        
        for cluster in $cluster_names; do
            echo "📋 Cluster: $cluster"
            
            # Get node pools
            local node_pools=$(gcloud container node-pools list --cluster=$cluster --zone=$ZONE --project=$PROJECT_ID --format="table(name,machineType,diskSizeGb,status,autoscaling.enabled,autoscaling.minNodeCount,autoscaling.maxNodeCount)" 2>/dev/null || echo "No node pools found")
            echo "Node Pools:"
            echo "$node_pools"
            echo ""
            
            # Calculate estimated costs
            local machine_types=$(gcloud container node-pools list --cluster=$cluster --zone=$ZONE --project=$PROJECT_ID --format="value(config.machineType)" 2>/dev/null || echo "")
            local node_count=$(gcloud container node-pools list --cluster=$cluster --zone=$ZONE --project=$PROJECT_ID --format="value(initialNodeCount)" 2>/dev/null || echo "0")
            
            if [[ -n "$machine_types" ]]; then
                echo "💰 Estimated Monthly Costs (approximate):"
                for machine_type in $machine_types; do
                    case $machine_type in
                        "e2-standard-4")
                            echo "   $machine_type: ~$134/month per node"
                            ;;
                        "e2-standard-2")
                            echo "   $machine_type: ~$67/month per node"
                            ;;
                        "n2-standard-4")
                            echo "   $machine_type: ~$195/month per node"
                            ;;
                        *)
                            echo "   $machine_type: Check GCP pricing calculator"
                            ;;
                    esac
                done
                echo "   Current nodes: $node_count"
                echo "   🔥 With autoscaling, costs can scale up to max node count!"
            fi
            echo ""
        done
    else
        echo -e "${GREEN}✅ No active GKE clusters found${NC}"
    fi
}

check_compute_instances() {
    print_section "Compute Engine Instances"
    
    local instances=$(gcloud compute instances list --project=$PROJECT_ID --format="table(name,zone,machineType,status,scheduling.preemptible)" 2>/dev/null || echo "")
    
    if [[ -n "$instances" && "$instances" != "Listed 0 items." ]]; then
        echo "Active Compute Engine Instances:"
        echo "$instances"
        echo ""
        echo -e "${YELLOW}⚠️  These instances are incurring compute costs${NC}"
    else
        echo -e "${GREEN}✅ No active Compute Engine instances found${NC}"
    fi
    echo ""
}

check_storage() {
    print_section "Storage Analysis"
    
    # Cloud Storage buckets
    local buckets=$(gsutil ls -p $PROJECT_ID 2>/dev/null || echo "")
    
    if [[ -n "$buckets" ]]; then
        echo "Cloud Storage Buckets:"
        for bucket in $buckets; do
            echo "  $bucket"
            # Get bucket size (this can be slow for large buckets)
            local size=$(gsutil du -sh "$bucket" 2>/dev/null | cut -f1 || echo "Unknown")
            echo "    Size: $size"
        done
        echo ""
        echo "💰 Storage costs depend on:"
        echo "   - Storage class (Standard, Nearline, Coldline, Archive)"
        echo "   - Data transfer and operations"
        echo "   - Use 'gsutil du -sh gs://bucket-name' for detailed sizes"
    else
        echo -e "${GREEN}✅ No Cloud Storage buckets found${NC}"
    fi
    echo ""
    
    # Persistent disks
    local disks=$(gcloud compute disks list --project=$PROJECT_ID --format="table(name,zone,sizeGb,type,status)" 2>/dev/null || echo "")
    
    if [[ -n "$disks" && "$disks" != "Listed 0 items." ]]; then
        echo "Persistent Disks:"
        echo "$disks"
        echo ""
        echo "💰 Disk costs (approximate per GB/month):"
        echo "   - pd-standard: $0.040"
        echo "   - pd-ssd: $0.170"
        echo "   - pd-balanced: $0.100"
    else
        echo -e "${GREEN}✅ No persistent disks found${NC}"
    fi
    echo ""
}

check_networking() {
    print_section "Networking Resources"
    
    # Load balancers
    local lb_forwarding_rules=$(gcloud compute forwarding-rules list --project=$PROJECT_ID --format="table(name,region,IPAddress,target)" 2>/dev/null || echo "")
    
    if [[ -n "$lb_forwarding_rules" && "$lb_forwarding_rules" != "Listed 0 items." ]]; then
        echo "Load Balancer Forwarding Rules:"
        echo "$lb_forwarding_rules"
        echo ""
        echo -e "${YELLOW}⚠️  Load balancers incur hourly costs${NC}"
    else
        echo -e "${GREEN}✅ No load balancer forwarding rules found${NC}"
    fi
    
    # Static IP addresses
    local static_ips=$(gcloud compute addresses list --project=$PROJECT_ID --format="table(name,region,address,status)" 2>/dev/null || echo "")
    
    if [[ -n "$static_ips" && "$static_ips" != "Listed 0 items." ]]; then
        echo "Static IP Addresses:"
        echo "$static_ips"
        echo ""
        echo "💰 Unused static IPs cost ~$3/month each"
    else
        echo -e "${GREEN}✅ No static IP addresses found${NC}"
    fi
    echo ""
}

check_other_services() {
    print_section "Other Billable Services"
    
    # Cloud SQL
    local sql_instances=$(gcloud sql instances list --project=$PROJECT_ID --format="table(name,region,tier,status)" 2>/dev/null || echo "")
    
    if [[ -n "$sql_instances" && "$sql_instances" != "Listed 0 items." ]]; then
        echo "Cloud SQL Instances:"
        echo "$sql_instances"
        echo ""
    else
        echo -e "${GREEN}✅ No Cloud SQL instances found${NC}"
    fi
    
    # Cloud Functions
    local functions=$(gcloud functions list --project=$PROJECT_ID --format="table(name,status,trigger.httpsTrigger.url)" 2>/dev/null || echo "")
    
    if [[ -n "$functions" && "$functions" != "Listed 0 items." ]]; then
        echo "Cloud Functions:"
        echo "$functions"
        echo ""
    else
        echo -e "${GREEN}✅ No Cloud Functions found${NC}"
    fi
    
    # Cloud Run services
    local run_services=$(gcloud run services list --project=$PROJECT_ID --format="table(metadata.name,status.url,status.conditions[0].status)" 2>/dev/null || echo "")
    
    if [[ -n "$run_services" && "$run_services" != "Listed 0 items." ]]; then
        echo "Cloud Run Services:"
        echo "$run_services"
        echo ""
    else
        echo -e "${GREEN}✅ No Cloud Run services found${NC}"
    fi
    echo ""
}

generate_cost_recommendations() {
    print_section "Cost Optimization Recommendations"
    
    echo "🔍 Cost-saving opportunities:"
    echo ""
    echo "1. 💡 GKE Autoscaling:"
    echo "   - Ensure node autoscaling is properly configured"
    echo "   - Consider preemptible nodes for non-critical workloads (60-91% discount)"
    echo "   - Use cluster autoscaler to scale down when not needed"
    echo ""
    echo "2. 💡 Right-sizing:"
    echo "   - Monitor actual CPU/memory usage vs. allocated"
    echo "   - Consider smaller machine types if resources are underutilized"
    echo "   - Use GKE autopilot for optimized resource allocation"
    echo ""
    echo "3. 💡 Storage optimization:"
    echo "   - Move infrequently accessed data to Nearline/Coldline storage"
    echo "   - Set up lifecycle policies for automatic data management"
    echo "   - Delete unnecessary persistent disks and snapshots"
    echo ""
    echo "4. 💡 Networking:"
    echo "   - Release unused static IP addresses"
    echo "   - Optimize data transfer patterns"
    echo "   - Consider Cloud NAT vs. individual external IPs"
    echo ""
    echo "5. 💡 Monitoring:"
    echo "   - Set up billing alerts and budgets"
    echo "   - Export billing data to BigQuery for detailed analysis"
    echo "   - Use committed use discounts for predictable workloads"
    echo ""
}

show_cost_monitoring_setup() {
    print_section "Cost Monitoring Setup"
    
    echo "📈 To track costs effectively, set up:"
    echo ""
    echo "1. Billing alerts:"
    echo "   gcloud alpha billing budgets create \\"
    echo "     --billing-account=BILLING_ACCOUNT_ID \\"
    echo "     --display-name='Dytallix Budget Alert' \\"
    echo "     --budget-amount=100USD"
    echo ""
    echo "2. Export billing data to BigQuery:"
    echo "   - Go to Cloud Console → Billing → Billing Export"
    echo "   - Set up daily cost export to BigQuery"
    echo ""
    echo "3. Use Cloud Monitoring for resource metrics:"
    echo "   - Set up alerts for high CPU/memory usage"
    echo "   - Monitor network egress"
    echo ""
    echo "4. Regular cost reviews:"
    echo "   - Weekly: Check this script output"
    echo "   - Monthly: Review detailed billing reports"
    echo "   - Quarterly: Optimize resource allocation"
    echo ""
}

cleanup_recommendations() {
    print_section "Immediate Cleanup Actions"
    
    echo "🧹 To reduce costs immediately:"
    echo ""
    echo "1. Stop/delete unused GKE clusters:"
    echo "   gcloud container clusters delete CLUSTER_NAME --zone=ZONE"
    echo ""
    echo "2. Delete unused Compute Engine instances:"
    echo "   gcloud compute instances delete INSTANCE_NAME --zone=ZONE"
    echo ""
    echo "3. Release unused static IP addresses:"
    echo "   gcloud compute addresses delete ADDRESS_NAME --region=REGION"
    echo ""
    echo "4. Delete unnecessary persistent disks:"
    echo "   gcloud compute disks delete DISK_NAME --zone=ZONE"
    echo ""
    echo "5. Clean up storage buckets:"
    echo "   gsutil rm -r gs://bucket-name"
    echo ""
    echo -e "${RED}⚠️  WARNING: Only delete resources you're sure are not needed!${NC}"
    echo ""
}

main() {
    print_header
    check_authentication
    check_billing
    check_gke_resources
    check_compute_instances
    check_storage
    check_networking
    check_other_services
    generate_cost_recommendations
    show_cost_monitoring_setup
    cleanup_recommendations
    
    echo -e "${BLUE}============================================${NC}"
    echo -e "${BLUE}           Analysis Complete${NC}"
    echo -e "${BLUE}============================================${NC}"
    echo ""
    echo "💡 For detailed cost analysis, visit:"
    echo "   https://console.cloud.google.com/billing/reports"
    echo ""
    echo "📊 For resource monitoring, visit:"
    echo "   https://console.cloud.google.com/monitoring"
    echo ""
}

# Run the analysis
main "$@"
