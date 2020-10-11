package business

import (
	"errors"
	"io/ioutil"
	"log"
	"path/filepath"
	"strconv"
	"time"

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
	if !stripeConfig.NewEnrollments {
		return "", errors.New("this instance of WPG isn't accepting new plan enrollments right now")
	}

	plan := GetPlan(tx, plan_id)
	if plan == nil {
		return "", errors.New("unable to find plan by that identifier")
	}

	if price_cents < plan.MinPriceCents {
		return "", errors.New("suggested price is too low for this plan: " + strconv.FormatUint(uint64(price_cents), 10) + "<" + strconv.FormatUint(uint64(plan.MinPriceCents), 10))
	}

	if price_cents > plan.MaxPriceCents {
		return "", errors.New("suggested price is too high for this plan: " + strconv.FormatUint(uint64(price_cents), 10) + ">" + strconv.FormatUint(uint64(plan.MaxPriceCents), 10))
	}

	params := &stripe.CheckoutSessionParams{
		SuccessURL: stripe.String(stripeConfig.BaseURL + "/?plan_id=" + strconv.FormatUint(plan_id, 10) + "#success"),
		CancelURL:  stripe.String(stripeConfig.BaseURL + "/#pricing"),
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
		ClientReferenceID: stripe.String("wpg-" + strconv.FormatUint(user.ID, 10)),
	}

	if user.Email.Valid {
		params.CustomerEmail = stripe.String(user.Email.String)
	}

	current, err := session.New(params)
	if err != nil {
		log.Println("Unable to create stripe session object:", err)
		return "", errors.New("unable to create stripe session object")
	}

	var user_plan database.UserPlan
	user_plan.UserID = user.ID
	user_plan.PlanID = plan_id
	user_plan.Active = false
	user_plan.StripePending = true
	user_plan.PriceCents = price_cents
	user_plan.BillingFrequency = plan.BillingFrequency
	user_plan.StripeSessionID = current.ID
	user_plan.LastBilled = time.Now()
	user_plan.Expires = time.Now().Add(10 * 365 * 24 * time.Hour)
	if plan.BillingFrequency > 0 {
		user_plan.Expires = time.Now().Add((3 * plan.BillingFrequency) / 2)
	}

	return current.ID, tx.Create(&user_plan).Error
}

func GetStripePublishableKey() string {
	return stripeConfig.PublishableKey
}

func UpdateUsersPlans(tx *gorm.DB, user database.User) error {
	var pending_plans []uint64
	if err := tx.Model(&database.UserPlan{}).Where("user_plans.user_id = ? AND user_plans.stripe_pending = ?", user.ID, true).Select("user_plans.id").Find(&pending_plans).Error; err != nil {
		return err
	}

	var candidateError error = nil
	for index, user_plan_id := range pending_plans {
		if index > 0 && user_plan_id == pending_plans[index-1] {
			continue
		}

		var user_plan database.UserPlan
		if err := tx.First(&user_plan, user_plan_id).Error; err != nil {
			log.Println("Got error loading user_plan: ", user_plan_id, err)
			candidateError = err
			continue
		}

		current, err := session.Get(user_plan.StripeSessionID, nil)
		if err != nil {
			log.Println("Unable to contact stripe about this transaction:", user_plan_id, user_plan.StripeSessionID, err)
			candidateError = err
			continue
		}

		if current.PaymentStatus == stripe.CheckoutSessionPaymentStatusPaid {
			user_plan.Active = true
			user_plan.StripePending = false

			if user_plan.BillingFrequency > 0 {
				user_plan.Expires = user_plan.LastBilled.Add((3 * user_plan.BillingFrequency) / 2)
			}

			if err := tx.Save(&user_plan).Error; err != nil {
				return err
			}
		}
	}

	return candidateError
}
