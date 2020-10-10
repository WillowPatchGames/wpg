package business

import (
	"errors"
	"io/ioutil"
	"log"
	"path/filepath"
	"strconv"

	"github.com/stripe/stripe-go/v72"
	"github.com/stripe/stripe-go/v72/checkout/session"
	"gopkg.in/yaml.v2"
	"gorm.io/gorm"

	"git.cipherboy.com/WillowPatchGames/wpg/internal/database"
)

type StripeConfig struct {
	PublishableKey string `yaml:"publishable"`
	SecretKey      string `yaml:"secret"`
	NewEnrollments bool   `yaml:"new_enrollments"`
	BaseURL        string `yaml:"base_url"`
}

var stripeConfig StripeConfig

func LoadStripeConfig(path string) error {
	plan_data, err := ioutil.ReadFile(filepath.Clean(path))
	if err != nil {
		return err
	}

	if err := yaml.Unmarshal(plan_data, &stripeConfig); err != nil {
		return err
	}

	if stripeConfig.SecretKey == "" {
		return errors.New("unable to use stripe with empty secret key")
	}

	if stripeConfig.PublishableKey == "" {
		return errors.New("unable to use stripe with empty publishable key")
	}

	stripe.Key = stripeConfig.SecretKey

	return nil
}

func ExecuteStripePayment(tx *gorm.DB, user *database.User, plan_id uint64, price_cents uint) (string, error) {
	stripe.Key = stripeConfig.SecretKey

	base_url := "https://" + stripeConfig.BaseURL + "/?plan_id=" + strconv.FormatUint(plan_id, 10)

	plan := GetPlan(tx, plan_id)
	if plan == nil {
		return "", errors.New("unable to find plan by that identifier")
	}

	if price_cents <= plan.MinPriceCents {
		return "", errors.New("suggested price is too low for this plan: " + strconv.FormatUint(uint64(price_cents), 10) + "<" + strconv.FormatUint(uint64(plan.MinPriceCents), 10))
	}

	if price_cents >= plan.MaxPriceCents {
		return "", errors.New("suggested price is too high for this plan: " + strconv.FormatUint(uint64(price_cents), 10) + ">" + strconv.FormatUint(uint64(plan.MaxPriceCents), 10))
	}

	params := &stripe.CheckoutSessionParams{
		SuccessURL: stripe.String(base_url + "#success"),
		CancelURL:  stripe.String(base_url + "#cancel"),
		PaymentMethodTypes: stripe.StringSlice([]string{
			"card",
		}),
		Mode: stripe.String(string(stripe.CheckoutSessionModePayment)),
		LineItems: []*stripe.CheckoutSessionLineItemParams{
			&stripe.CheckoutSessionLineItemParams{
				PriceData: &stripe.CheckoutSessionLineItemPriceDataParams{
					Currency: stripe.String("usd"),
					ProductData: &stripe.CheckoutSessionLineItemPriceDataProductDataParams{
						Name:        stripe.String(plan.Name),
						Description: stripe.String(plan.Description),
					},
					UnitAmount: stripe.Int64(int64(price_cents)),
				},
				Quantity: stripe.Int64(1),
			},
		},
	}

	current, err := session.New(params)
	if err != nil {
		log.Println("Unable to create stripe session object:", err)
		return "", errors.New("unable to create stripe session object")
	}

	return current.ID, nil
}

func GetStripePublishableKey() string {
	return stripeConfig.PublishableKey
}
